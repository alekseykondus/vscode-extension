const fs = require('fs');
const path = require('path');
const { getPrompt, refactoringPrompts } = require('./../prompts');
const util = require('util');
const { exec } = require('child_process');
const execPromise = util.promisify(exec);
const { Table } = require('console-table-printer');
const { getAIResponse } = require("./../aiService");

const models = [
  'gpt-4-turbo',
  'gpt-3.5-turbo',
  'gpt-4o',
  'grok-3-latest',
  'grok-2-latest',
  'deepseek-chat',
  'claude-3-7-sonnet-20250219', 
  'claude-3-5-haiku-20241022',
  'gemini-2.5-pro-exp-03-25',
  'gemini-1.5-pro-latest',
  'gemini-2.0-flash'
];


async function runTests(refactoredCode, modelName) {
  const testDir = path.join(__dirname, 'tests');
  
  // let transformedCode = refactoredCode;
  // const lines = transformedCode.split('\n');
  // const lastLine = lines[lines.length - 1].trim();
  // if (lastLine.includes('export')) {
  //   lines[lines.length - 1] = 'module.exports = TaskManager;';
  //   transformedCode = lines.join('\n');
  // }

  fs.writeFileSync(path.join(__dirname, 'TaskManager.js'), refactoredCode);
  
  try {
    const { stdout } = await execPromise(`cd ${testDir} && npx jest TaskManager.test.js --json`);
    const results = JSON.parse(stdout);
    
    return {
      passed: results.numPassedTests,
      failed: results.numFailedTests,
      total: results.numTotalTests
    };
  } catch (error) {
    try {
      const results = JSON.parse(error.stdout);
      return {
        passed: results.numPassedTests,
        failed: results.numFailedTests,
        total: results.numTotalTests
      };
    } catch (parseError) {
      return {
        passed: 0,
        failed: 32,
        total: 32,
        error: parseError.message
      };
    }
  }
}

function formatTime(ms) {
  return (ms / 1000).toFixed(2) + 's';
}

function printResultsTableAndWriteToFile(results) {
  console.log(`\n=== EXPERIMENT RESULTS ===\n`);

  const p = new Table();

  for (const model in results) {
    const modelResults = results[model];
    
    const totalPassed = modelResults.reduce((sum, r) => sum + (r.passed || 0), 0);
    const totalFailed = modelResults.reduce((sum, r) => sum + (r.failed || 0), 0);
    const totalTests = modelResults.reduce((sum, r) => sum + (r.total || 0), 0);
    const successRate = totalTests > 0 ? (totalPassed / totalTests) * 100 : 0;
    
    const times = modelResults.map(r => r.responseTime).filter(t => t !== undefined);
    const avgTime = times.length > 0 ? times.reduce((sum, t) => sum + t, 0) / times.length : 0;
    
    let color = 'red';
    if (successRate >= 90) color = 'green';
    else if (successRate >= 80) color = 'yellow';
    
    p.addRow({
    'Model': model,
    'Success Rate': `${successRate.toFixed(2)}%`,
    'Avg Response Time': formatTime(avgTime),
    'Passed': totalPassed,
    'Failed': totalFailed,
    'Total': totalTests
    }, { color: color });
  }

  p.printTable();

  const tableString = p.render().replace(/\x1B\[[0-9;]*[a-zA-Z]/g, '');;
  fs.writeFileSync(
    path.join(__dirname, 'results/experiment_results.md'), 
    tableString
  );

  fs.writeFileSync(
    path.join(__dirname, 'results/experiment_results.json'), 
    JSON.stringify(results, null, 2)
  );
  console.log(`\nResults saved to experiment_results.json and experiment_results.md`);
}

function preparePromptAndCode() {
  const originalCode = fs.readFileSync(path.join(__dirname, 'TaskManager_save_copy.js'), 'utf8');
  const basePrompt = getPrompt(refactoringPrompts, "javascript");
  const prompt = `${basePrompt}\n\nDo not change the names of any methods, as this is critical for ensuring that all tests pass after refactoring. You can change everything inside, the main thing is to leave the same method names.`;
  
  return { originalCode, prompt };
}

function clearTaskManagerFile() {
  fs.writeFileSync(path.join(__dirname, 'TaskManager.js'), '');
  console.log(`   Cleared TaskManager.js`);
}

async function executeAttempt(model, attemptNumber, originalCode, prompt) {
  console.log(`   Attempt ${attemptNumber + 1}`);
  
  try {
    clearTaskManagerFile();

    const startTime = Date.now();
    const refactoredCode = await getAIResponse(originalCode, prompt, model);
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    console.log(`   AI response time: ${formatTime(responseTime)}`);
    
    const testResult = await runTests(refactoredCode);
    console.log(`   Test result:`, testResult);
    
    const result = {
      attempt: attemptNumber + 1,
      passed: testResult.passed,
      failed: testResult.failed,
      total: testResult.total,
      responseTime: responseTime
    };
    
    console.log(`   Results: ${testResult.passed}/${testResult.total} tests passed (${testResult.failed} failed)`);
    return result;
  } catch (error) {
      console.error(`   Error with ${model}:`, error);
      return {
        attempt: attemptNumber + 1,
        error: error.message
    };
  }
}

async function testModel(model, attempts, originalCode, prompt) {
  console.log(`Testing ${model}...`);
  const modelResults = [];

  for (let i = 0; i < attempts; i++) {
    const result = await executeAttempt(model, i, originalCode, prompt);
    modelResults.push(result);
  }

  return modelResults;
}

async function runExperiment(attempts = 100) {
  const { originalCode, prompt } = preparePromptAndCode();
  const results = {};

  for (const model of models) {
    results[model] = await testModel(model, attempts, originalCode, prompt);
  }

  printResultsTableAndWriteToFile(results); 
  return results;
}

exports.runExperiment = runExperiment;