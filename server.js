// Fixed server.js with theta calculation timeout issue resolved
const archiver = require('archiver');
const express = require('express');
const multer = require('multer');
const AdmZip = require('adm-zip');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { exec, spawn } = require('child_process');
const { promisify } = require('util');
const { file } = require('jszip');

const execAsync = promisify(exec);
const app = express();
const port = 3001;
let compiledExecutablePath = null;
let minPartnum = 1;    // default values
let maxPartnum = 21;
let minBandnum = 1;
let maxBandnum = 21;

app.use(cors());
app.use(express.json());

// Task name enum mapping
const TASK_NAMES = {
  'canneal': 0,
  'dedup': 1,
  'fft': 2,
  'streamcluster': 3,
  'radiosity': 4
};

// Global array to store unique task names from user input
// Fixed task name storage logic

// Global array to store unique task names from user input
let savedTaskNames = ["fft"]; // Keep your default

// Function to add task name (call this when files are uploaded with a task name)
function addTaskName(taskName) {
  if (taskName && typeof taskName === 'string' && taskName.trim()) {
    const cleanTaskName = taskName.trim().toLowerCase();
    
    // Check if task name already exists (case-insensitive)
    const exists = savedTaskNames.some(name => 
      name.toLowerCase() === cleanTaskName
    );
    
    if (!exists) {
      savedTaskNames.push(taskName.trim()); // Store original case
      console.log(`Added new task name: ${taskName}`);
      return true;
    } else {
      console.log(`Task name already exists: ${taskName}`);
      return false;
    }
  }
  return false;
}

// Function to get available task names
function getAvailableTaskNames() {
  return [...savedTaskNames]; // Return a copy
}

// Modified processUploadedFilesOptimized function
async function processUploadedFilesOptimized(files, taskName) {
  const taskDir = path.join('./input-data', taskName);
  ensureDirectoryExists(taskDir);
  
  // Store the task name when processing files
  addTaskName(taskName);

  const processedFiles = [];
  const zipFiles = files.filter(f => f.originalname.toLowerCase().endsWith('.zip'));
  const regularFiles = files.filter(f => !f.originalname.toLowerCase().endsWith('.zip'));

  console.log(`Processing ${zipFiles.length} zip files and ${regularFiles.length} regular files for task: ${taskName}`);

  // Process regular files
  if (regularFiles.length > 0) {
    console.log('Processing regular files...');
    for (const file of regularFiles) {
      const uniqueName = getUniqueFilename(taskDir, file.originalname);
      const destPath = path.join(taskDir, uniqueName);
      
      try {
        fs.renameSync(file.path, destPath);
        processedFiles.push(destPath);
      } catch (err) {
        console.error(`Error moving ${file.originalname}:`, err.message);
      }
    }
  }

  // Process zip files
  for (const file of zipFiles) {
    try {
      await extractZipFileOptimized(file.path, taskName);
    } catch (err) {
      console.error(`Error processing zip ${file.originalname}:`, err.message);
    } finally {
      try {
        fs.unlinkSync(file.path);
      } catch (err) {
        console.warn(`Could not delete zip ${file.path}`);
      }
    }
  }

  const finalFiles = getAllFilesOptimized(taskDir, 1);
  console.log(`Total files in input-data/${taskName}: ${finalFiles.length}`);
  
  return finalFiles;
}

// Fixed generateTaskSet function - REMOVE task name addition logic here
function generateTaskSet(targetUtil, minWithin, maxWithin, cores, maxPart, maxBand, currentTaskName) {
  const tasks = [];
  
  // Get available task names (don't add the current one here)
  const availableTaskNames = getAvailableTaskNames();
  
  // If no task names available, return empty task set
  if (availableTaskNames.length === 0) {
    console.warn('No task names available for task generation');
    return [];
  }
  
  console.log(`Available task names for generation: ${availableTaskNames.join(', ')}`);
  
  // Convert string inputs to numbers
  target = parseFloat(targetUtil);
  const min = parseFloat(minWithin);
  const max = parseFloat(maxWithin);
  const numCores = parseInt(cores);
  const maxPartitions = parseInt(maxPart);
  const maxBandwidth = parseInt(maxBand);
  const wcetfile=maxPartitions/numCores;
  const wcetbw=(maxBandwidth-1)*72
  const wcetpart=(maxPartitions-1)**2 -1
  console.log(`Using wcet parameters: wcetfile=${wcetfile}, wcetbw=${wcetbw}, wcetpart=${wcetpart}`);

  target = numCores * target;
  let remainingUtil = target;
  let id = 0;
  
  console.log(`Generating task set with target utilization: ${target}`);
  
  while (remainingUtil > 0) {
    id++;
    
    // Random task name selection from available task names
    const nameIndex = Math.floor(Math.random() * availableTaskNames.length);
    const selectedTaskName = availableTaskNames[nameIndex];
    console.log(selectedTaskName)
    
    // Generate random utilization within bounds
    let utilization = Math.random() * (max - min) + min;
    
    // Don't exceed remaining utilization
    if (utilization > remainingUtil) {
      utilization = remainingUtil;
    }
    
    const fs = require('fs');
    let wcet;
    const filenameOut = path.join(
      "output-phases",
      selectedTaskName,
      `${wcetpart}_${wcetbw}`, // convert numbers to string using template literal
      "wcet.txt"
    );
    console.log(filenameOut)
    // Check if the wcet.txt file exists for the selected task
    if (!fs.existsSync(filenameOut)) {
      console.warn(`WCET file not found for task ${selectedTaskName}, trying alternative path...`);
      const alternativePath = path.join("output-phases", selectedTaskName, "1023_1008", "wcet.txt");
      if (fs.existsSync(alternativePath)) {
        const content = fs.readFileSync(alternativePath, 'utf-8').trim();
        wcet = parseFloat(content);
      } else {
        console.error(`No WCET file found for task ${selectedTaskName}, skipping this task`);
        continue;
      }
    } else {
      const content = fs.readFileSync(filenameOut, 'utf-8').trim();
      wcet = parseFloat(content);
    }

    // Validate wcet value
    if (isNaN(wcet) || wcet <= 0) {
      console.error(`Invalid WCET value for task ${selectedTaskName}: ${wcet}, skipping this task`);
      continue;
    }
    
    // Calculate period from utilization: period = wcet / utilization
    const period = wcet / utilization;
    
    remainingUtil -= utilization;
    
    const task = new Task(id, selectedTaskName, utilization, period, wcet);
    tasks.push(task);
    
    console.log(`Generated: ${task.toString()}`);
  }
  
  console.log(`Task set generation complete. Generated ${tasks.length} tasks.`);
  return tasks;
}

function getAllFilesOptimized(dirPath, maxDepth = 3, currentDepth = 0) {
  const files = [];
  const validExtensions = new Set(['.csv', '.json', '.xml', '.txt', '.dat', '.xlsx']);
  
  if (currentDepth > maxDepth || !fs.existsSync(dirPath)) {
    return files;
  }
  
  try {
    const items = fs.readdirSync(dirPath, { withFileTypes: true });
    
    for (const item of items) {
      const fullPath = path.join(dirPath, item.name);
      
      if (item.isDirectory() && currentDepth < maxDepth) {
        files.push(...getAllFilesOptimized(fullPath, maxDepth, currentDepth + 1));
      } else if (item.isFile()) {
        const ext = path.extname(item.name).toLowerCase();
        if (validExtensions.has(ext)) {
          files.push(fullPath);
        }
      }
    }
  } catch (error) {
    console.warn(`Could not read directory ${dirPath}:`, error.message);
  }
  
  return files;
}

// Add new API endpoint to get stored task names
app.get('/api/task-names', (req, res) => {
  res.json({
    success: true,
    taskNames: getAvailableTaskNames(),
    count: savedTaskNames.length
  });
});

// Add new API endpoint to manually add task name
app.post('/api/add-task-name', (req, res) => {
  const { taskName } = req.body;
  
  if (!taskName) {
    return res.status(400).json({
      success: false,
      error: 'Task name is required'
    });
  }
  
  const added = addTaskName(taskName);
  
  res.json({
    success: true,
    added: added,
    message: added ? `Task name '${taskName}' added successfully` : `Task name '${taskName}' already exists`,
    taskNames: getAvailableTaskNames()
  });
});

let memoryBandwidth = 1;
let cpuFreq = 1.3;

// Update partitions / memory bandwidth
app.post('/update-partitions', (req, res) => {
  const { partitions: val } = req.body; // value sent from frontend
  if (typeof val === 'number' && val >= 1 && val <= 20) {
    partitionsConfig.cache = val; // or update dynamically with resourceId if you send it
    console.log('Partitions updated to:', partitionsConfig);
    res.status(200).send({ success: true });
  } else {
    console.log('Invalid partitions value:', val);
    res.status(400).send({ error: 'Invalid value' });
  }
});

app.use('/api/send-data', (req, res, next) => {
  console.log('=== /api/send-data endpoint hit ===');
  console.log('Method:', req.method);
  console.log('Headers:', req.headers);
  console.log('Body:', req.body);
  next();
});

app.post('/api/send-data', (req, res) => {
  const { minPart, maxPart, minBandwidth, maxBandwidth } = req.body;
  
  // Log the received data
  console.log('Received data from frontend:', { minPart, maxPart, minBandwidth, maxBandwidth });

  // Update the global variables (these are declared at the top of your file)
  if (minPart !== undefined) minPartnum = parseInt(minPart);
  if (maxPart !== undefined) maxPartnum = parseInt(maxPart);
  if (minBandwidth !== undefined) minBandnum = parseInt(minBandwidth);
  if (maxBandwidth !== undefined) maxBandnum = parseInt(maxBandwidth);

  console.log('Updated global variables:', { minPartnum, maxPartnum, minBandnum, maxBandnum });

  // Respond with confirmation
  res.json({ 
    message: 'Data received and updated successfully', 
    received: { minPart, maxPart, minBandwidth, maxBandwidth },
    updated: { minPartnum, maxPartnum, minBandnum, maxBandnum }
  });
});

// Get partitions / memory bandwidth
app.get('/get-partitions', (req, res) => {
  res.send({ partitions: partitionsConfig });
});


// Update CPU frequency
app.post('/update-bw', (req, res) => {
  const { memoryBandwidth: val } = req.body;
  if (typeof val === 'number' && val >= 1 && val <= 20) {
    memoryBandwidth = val;
    console.log('Memory bandwidth updated to:', memoryBandwidth);
    res.status(200).send({ success: true });
  } else {
    console.log('Invalid memoryBandwidth value:', val);
    res.status(400).send({ error: 'Invalid value' });
  }
});


// Get CPU frequency
app.get('/get-bw', (req, res) => {
  res.send({ memoryBandwidth });
});



// Modified task generation endpoint - pass currentTaskName but don't add it to the array
app.post('/api/generate-tasks', (req, res) => {
  try {
    const { targetUtil, minWithin, maxWithin, cores, taskName, maxPart, maxBandwidth, exportFormat } = req.body;
    
    console.log('Received request body:', req.body);
    
    // Validate required parameters
    if (targetUtil === undefined || minWithin === undefined || maxWithin === undefined || 
        cores === undefined) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required parameters: targetUtil, minWithin, maxWithin, cores, maxPart',
        received: { targetUtil, minWithin, maxWithin, cores, taskName }
      });
    }
    
    // Check if we have any stored task names
    const availableTaskNames = getAvailableTaskNames();
    if (availableTaskNames.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No task names available. Please upload files for tasks first.',
        availableTaskNames: []
      });
    }
    
    // Additional validation
    const targetUtilNum = parseFloat(targetUtil);
    const minWithinNum = parseFloat(minWithin);
    const maxWithinNum = parseFloat(maxWithin);
    const coresNum = parseInt(cores);
    const maxPartnum = parseInt(maxPart);
    const maxBandnum = parseInt(maxBandwidth);
    
    if (isNaN(targetUtilNum) || isNaN(minWithinNum) || isNaN(maxWithinNum) || 
        isNaN(coresNum) || isNaN(maxPartnum)) {
      return res.status(400).json({ 
        success: false, 
        error: 'All parameters must be valid numbers'
      });
    }
    
    console.log('=== TASK GENERATION STARTED ===');
    console.log(`Parameters: targetUtil=${targetUtil}, minWithin=${minWithin}, maxWithin=${maxWithin}, cores=${cores}, maxPart=${maxPart}, maxBandwidth=${maxBandwidth}`);
    console.log(`Available task names: ${availableTaskNames.join(', ')}`);
    
    // Generate task set (don't add taskName to the stored names)
    const tasks = generateTaskSet(targetUtil, minWithin, maxWithin, cores, maxPartnum, maxBandnum, taskName);
    
    if (tasks.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No tasks could be generated. Check if WCET files exist for stored task names.',
        availableTaskNames: availableTaskNames
      });
    }
    
    // Export to files
    const exportedFiles = [];
    const exportTaskName = taskName || 'generated';
    
    if (!exportFormat || exportFormat.includes('csv')) {
      const csvPath = exportTasksToCSV(tasks, exportTaskName);
      exportedFiles.push(csvPath);
    }
    
    if (!exportFormat || exportFormat.includes('txt')) {
      const txtPath = exportTasksToTXT(tasks, exportTaskName);
      exportedFiles.push(txtPath);
    }
    
    const totalUtilization = tasks.reduce((sum, task) => sum + task.utilization, 0);
    
    console.log('=== TASK GENERATION COMPLETED ===');
    
    res.json({
      success: true,
      message: 'Task generation completed successfully',
      taskCount: tasks.length,
      totalUtilization: parseFloat(totalUtilization.toFixed(6)),
      targetUtilization: parseFloat(targetUtil),
      utilizationError: Math.abs(totalUtilization - parseFloat(targetUtil)),
      availableTaskNames: availableTaskNames,
      exportedFiles: exportedFiles,
      tasks: tasks.map(task => ({
        id: task.id,
        name: task.name,
        utilization: parseFloat(task.utilization.toFixed(6)),
        period: parseFloat(task.period.toFixed(6)),
        wcet: parseFloat(task.wcet.toFixed(6))
      }))
    });
    
  } catch (error) {
    console.error('Task generation error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

function verifyThetaFilesOptimized(taskName) {
  const taskOutputDir = path.join(__dirname, 'output-phases', taskName);
  
  if (!fs.existsSync(taskOutputDir)) {
    return { success: false, error: 'Output directory not found' };
  }

  let subdirs;
  try {
    subdirs = fs.readdirSync(taskOutputDir, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);
  } catch (err) {
    return { success: false, error: 'Could not read output directory' };
  }

  let thetasFound = 0;
  const missingThetas = [];

  for (const subdir of subdirs) {
    const thetaPath = path.join(taskOutputDir, subdir, 'theta.txt');
    
    if (fs.existsSync(thetaPath)) {
      thetasFound++;
    } else {
      missingThetas.push(subdir);
    }
  }

  return {
    success: missingThetas.length === 0,
    totalDirs: subdirs.length,
    thetasFound: thetasFound,
    missingThetas: missingThetas.slice(0, 5)
  };
}


// UPDATED API endpoint for task generation with better error handling
  
class Task {
  constructor(taskId, name, utilization, period, wcet) {
    this.id = taskId;
    this.name = name;
    this.utilization = utilization;
    this.period = period;
    this.wcet=wcet;
  }

  toString() {
    return `Task(id=${this.id}, name='${this.name}', utilization=${this.utilization}, period=${this.period}, wcet=${this.wcet})`;
  }
}

function extractZipFileOptimized(zipPath, taskName) {
  return new Promise((resolve, reject) => {
    try {
      const zip = new AdmZip(zipPath);
      const entries = zip.getEntries();
      
      const taskDir = path.join('./input-data', taskName);
      ensureDirectoryExists(taskDir);
      
      const relevantEntries = entries.filter(entry => {
        if (entry.isDirectory) return false;
        const name = entry.entryName.toLowerCase();
        return ['.csv', '.json', '.xml', '.txt', '.dat', '.xlsx'].some(ext => name.endsWith(ext));
      });
      
      console.log(`Extracting ${relevantEntries.length} files to input-data/${taskName}`);
      
      relevantEntries.forEach(entry => {
        try {
          const fileName = path.basename(entry.entryName);
          const uniqueFileName = getUniqueFilename(taskDir, fileName);
          const finalTargetPath = path.join(taskDir, uniqueFileName);
          
          const fileData = zip.readFile(entry);
          fs.writeFileSync(finalTargetPath, fileData);
          
        } catch (err) {
          console.warn(`Failed to extract ${entry.entryName}:`, err.message);
        }
      });
      
      console.log(`Extraction completed to input-data/${taskName}`);
      resolve(true);
    } catch (error) {
      console.error('Error in zip extraction:', error);
      reject(false);
    }
  });
}

function getAllFilesOptimized(dirPath, maxDepth = 3, currentDepth = 0) {
  const files = [];
  const validExtensions = new Set(['.csv', '.json', '.xml', '.txt', '.dat', '.xlsx']);
  
  if (currentDepth > maxDepth || !fs.existsSync(dirPath)) {
    return files;
  }
  
  try {
    const items = fs.readdirSync(dirPath, { withFileTypes: true });
    
    for (const item of items) {
      const fullPath = path.join(dirPath, item.name);
      
      if (item.isDirectory() && currentDepth < maxDepth) {
        files.push(...getAllFilesOptimized(fullPath, maxDepth, currentDepth + 1));
      } else if (item.isFile()) {
        const ext = path.extname(item.name).toLowerCase();
        if (validExtensions.has(ext)) {
          files.push(fullPath);
        }
      }
    }
  } catch (error) {
    console.warn(`Could not read directory ${dirPath}:`, error.message);
  }
  
  return files;
}

function getUniqueFilename(taskDir, originalName) {
  const targetPath = path.join(taskDir, originalName);
  
  if (!fs.existsSync(targetPath)) {
    return originalName;
  }
  
  const ext = path.extname(originalName);
  const nameWithoutExt = path.basename(originalName, ext);
  const timestamp = Date.now();
  return `${nameWithoutExt}_${timestamp}${ext}`;
}

async function processUploadedFilesOptimized(files, taskName) {
  const taskDir = path.join('./input-data', taskName);
  ensureDirectoryExists(taskDir);

  const processedFiles = [];
  const zipFiles = files.filter(f => f.originalname.toLowerCase().endsWith('.zip'));
  const regularFiles = files.filter(f => !f.originalname.toLowerCase().endsWith('.zip'));

  console.log(`Processing ${zipFiles.length} zip files and ${regularFiles.length} regular files`);

  // Process regular files
  if (regularFiles.length > 0) {
    console.log('Processing regular files...');
    for (const file of regularFiles) {
      const uniqueName = getUniqueFilename(taskDir, file.originalname);
      const destPath = path.join(taskDir, uniqueName);
      
      try {
        fs.renameSync(file.path, destPath);
        processedFiles.push(destPath);
      } catch (err) {
        console.error(`Error moving ${file.originalname}:`, err.message);
      }
    }
  }

  // Process zip files
  for (const file of zipFiles) {
    try {
      await extractZipFileOptimized(file.path, taskName);
    } catch (err) {
      console.error(`Error processing zip ${file.originalname}:`, err.message);
    } finally {
      try {
        fs.unlinkSync(file.path);
      } catch (err) {
        console.warn(`Could not delete zip ${file.path}`);
      }
    }
  }

  const finalFiles = getAllFilesOptimized(taskDir, 1);
  console.log(`Total files in input-data/${taskName}: ${finalFiles.length}`);
  
  return finalFiles;
}

async function compileOnceIfNeeded() {
  const buildDir = path.join(__dirname, 'calculate-thetas');
  const exePath = path.join(__dirname, 'dna_tool.exe');
  const sourcePath = path.join(buildDir, 'dna_tool.c');
  
  if (!fs.existsSync(buildDir) || !fs.existsSync(sourcePath)) {
    throw new Error(`Source files not found: ${sourcePath}`);
  }
  
  let needsCompile = !compiledExecutablePath || !fs.existsSync(compiledExecutablePath);
  
  if (!needsCompile) {
    try {
      const exeStat = fs.statSync(compiledExecutablePath);
      const srcStat = fs.statSync(sourcePath);
      needsCompile = srcStat.mtime > exeStat.mtime;
    } catch (err) {
      needsCompile = true;
    }
  }
  
  if (needsCompile) {
    console.log('Compiling C program...');
    
    try {
      await execAsync('make clean', { cwd: buildDir, timeout: 10000 });
    } catch (err) {
      // Ignore clean errors
    }
    
    const { stdout, stderr } = await execAsync('make', { 
      cwd: buildDir,
      timeout: 30000 
    });
    
    if (stdout) console.log('Compile output:', stdout);
    if (stderr && !stderr.includes('warning')) console.error('Compile errors:', stderr);
    
    if (!fs.existsSync(exePath)) {
      throw new Error('Compilation failed - executable not created');
    }
    
    compiledExecutablePath = exePath;
    console.log('Compilation completed');
  } else {
    console.log('Using cached executable');
  }
  
  return compiledExecutablePath;
}

// FIXED: Removed timeout conflicts in theta generation
async function generateThetaFilesOptimized(taskName) {
  try {
    console.log('Starting theta generation...');
    
    const exePath = await compileOnceIfNeeded();
    
    const taskEnum = TASK_NAMES[taskName.toLowerCase()];
    if (taskEnum === undefined) {
      console.warn(`Unknown task: ${taskName}, running without task parameter`);
    }
    
    console.log(`Running theta calculations for task: ${taskName}`);
    
    return new Promise((resolve, reject) => {
      const isWindows = process.platform === 'win32';
      const command = isWindows ? 'dna_tool.exe' : './dna_tool';
      const args = taskEnum !== undefined ? [taskEnum.toString()] : [];
      
      console.log(`Executing: ${command} ${args.join(' ')}`);
      
      // FIXED: Removed timeout from spawn options
      const child = spawn(command, args, {
        cwd: __dirname,
        stdio: ['pipe', 'pipe', 'pipe']
      });
      
      let stdout = '';
      let stderr = '';
      
      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      child.on('close', (code) => {
        if (code === 0) {
          console.log('Theta calculation completed successfully');
          resolve(true);
        } else {
          console.error(`Theta calculation failed with code: ${code}`);
          if (stderr) console.error('Error output:', stderr);
          resolve(false);
        }
      });
      
      child.on('error', (err) => {
        console.error('Spawn error:', err);
        resolve(false);
      });
      
      // FIXED: Removed the manual timeout that was killing the process
    });
    
  } catch (err) {
    console.error('Error in theta generation:', err);
    return false;
  }
}

function verifyThetaFilesOptimized(taskName) {
  const taskOutputDir = path.join(__dirname, 'output-phases', taskName);
  
  if (!fs.existsSync(taskOutputDir)) {
    return { success: false, error: 'Output directory not found' };
  }

  let subdirs;
  try {
    subdirs = fs.readdirSync(taskOutputDir, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);
  } catch (err) {
    return { success: false, error: 'Could not read output directory' };
  }

  let thetasFound = 0;
  const missingThetas = [];

  for (const subdir of subdirs) {
    const thetaPath = path.join(taskOutputDir, subdir, 'theta.txt');
    
    if (fs.existsSync(thetaPath)) {
      thetasFound++;
    } else {
      missingThetas.push(subdir);
    }
  }

  return {
    success: missingThetas.length === 0,
    totalDirs: subdirs.length,
    thetasFound: thetasFound,
    missingThetas: missingThetas.slice(0, 5)
  };
}



function exportTasksToCSV(tasks, taskName) {
  const headers = ['ID', 'Name', 'Utilization', 'Period', 'WCET'];
  let csvContent = headers.join(',') + '\n';
  
  tasks.forEach(task => {
    const row = [
      task.id, 
      task.name, 
      task.utilization.toFixed(6), 
      task.period.toFixed(6), 
      task.wcet.toFixed(6)  // Fixed: Now properly includes wcet with formatting
    ];
    csvContent += row.join(',') + '\n';
  });
  
  // Save to task-specific directory
  const taskDir = path.join('./generated-tasks', taskName);
  ensureDirectoryExists(taskDir);
  
  const csvPath = path.join(taskDir, 'generated_tasks.csv');
  fs.writeFileSync(csvPath, csvContent);
  
  console.log(`Tasks exported to CSV: ${csvPath}`);
  return csvPath;
}

function exportTasksToTXT(tasks, taskName) {
  let txtContent = 'Generated Task Set\n';
  txtContent += '==================\n\n';
  
  tasks.forEach(task => {
    txtContent += `${task.toString()}\n`;
  });
  
  txtContent += `\nTotal Tasks: ${tasks.length}\n`;
  txtContent += `Total Utilization: ${tasks.reduce((sum, task) => sum + task.utilization, 0).toFixed(6)}\n`;
  
  // Save to task-specific directory
  const taskDir = path.join('./generated-tasks', taskName);
  ensureDirectoryExists(taskDir);
  
  const txtPath = path.join(taskDir, 'generated_tasks.txt');
  fs.writeFileSync(txtPath, txtContent);
  
  console.log(`Tasks exported to TXT: ${txtPath}`);
  return txtPath;
}

// UPDATED API endpoint for task generation with better error handling
app.post('/api/generate-tasks', (req, res) => {
  try {
    const { targetUtil, minWithin, maxWithin, cores, maxPart, maxBand, taskName, exportFormat } = req.body;
    
    console.log('Received request body:', taskName, req.body);
    
    // Validate required parameters
    if (targetUtil === undefined || minWithin === undefined || maxWithin === undefined || 
        cores === undefined || maxPart === undefined || !taskName) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required parameters: targetUtil, minWithin, maxWithin, cores, maxPart, taskName',
        received: { targetUtil, minWithin, maxWithin, cores, maxPart, maxBand, taskName }
      });
    }
    
    // Additional validation
    const targetUtilNum = parseFloat(targetUtil);
    const minWithinNum = parseFloat(minWithin);
    const maxWithinNum = parseFloat(maxWithin);
    const coresNum = parseInt(cores);
    const maxPartnum = parseInt(maxPart);
    
    if (isNaN(targetUtilNum) || isNaN(minWithinNum) || isNaN(maxWithinNum) || 
        isNaN(coresNum) || isNaN(maxPartnum)) {
      return res.status(400).json({ 
        success: false, 
        error: 'All parameters must be valid numbers'
      });
    }
    
    console.log('=== TASK GENERATION STARTED ===');
    console.log(`Parameters: targetUtil=${targetUtil}, minWithin=${minWithin}, maxWithin=${maxWithin}, cores=${cores}, maxPart=${maxPartnum}`);
    
    // Generate task set
    const tasks = generateTaskSet(targetUtil, minWithin, maxWithin, cores, maxPartnum, maxBandnum, taskName);
    
    // Export to files
    const exportedFiles = [];
    
    if (!exportFormat || exportFormat.includes('csv')) {
      const csvPath = exportTasksToCSV(tasks, taskName);
      exportedFiles.push(csvPath);
    }
    
    if (!exportFormat || exportFormat.includes('txt')) {
      const txtPath = exportTasksToTXT(tasks, taskName);
      exportedFiles.push(txtPath);
    }
    
    const totalUtilization = tasks.reduce((sum, task) => sum + task.utilization, 0);
    
    console.log('=== TASK GENERATION COMPLETED ===');
    
    res.json({
      success: true,
      message: 'Task generation completed successfully',
      taskCount: tasks.length,
      totalUtilization: parseFloat(totalUtilization.toFixed(6)),
      targetUtilization: parseFloat(targetUtil),
      utilizationError: Math.abs(totalUtilization - parseFloat(targetUtil)),
      exportedFiles: exportedFiles,
      tasks: tasks.map(task => ({
        id: task.id,
        name: task.name,
        utilization: parseFloat(task.utilization.toFixed(6)),
        period: parseFloat(task.period.toFixed(6)),
        wcet: tparseFloat(task.wcet.toFixed(6)),
      }))
    });
    
  } catch (error) {
    console.error('Task generation error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});



const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = './input-data';
    ensureDirectoryExists(uploadDir);
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(7);
    cb(null, `${timestamp}-${random}-${file.originalname}`);
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB
    files: 50
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.zip', '.csv', '.json', '.xml', '.txt', '.dat', '.xlsx'];
    const ext = path.extname(file.originalname).toLowerCase();
    
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      console.warn(`Rejecting file type: ${ext}`);
      cb(null, false);
    }
  }
});

function ensureDirectoryExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

async function createZipFileOptimized(taskName) {
  const folderPath = path.join(__dirname, 'output-phases', taskName);
  const zipDir = path.join(__dirname, 'zipped-results');
  const zipFilePath = path.join(zipDir, `${taskName}_results.zip`);

  ensureDirectoryExists(zipDir);

  if (!fs.existsSync(folderPath)) {
    console.error('Folder not found for zipping:', folderPath);
    return null;
  }

  try {
    return new Promise((resolve, reject) => {
      const archive = archiver('zip', { 
        zlib: { level: 6 },
        forceLocalTime: true
      });
      const output = fs.createWriteStream(zipFilePath);

      archive.on('error', reject);
      output.on('close', () => {
        console.log(`Zip created: ${zipFilePath}`);
        resolve(zipFilePath);
      });

      archive.pipe(output);
      archive.directory(folderPath, false);
      archive.finalize();
    });

  } catch (err) {
    console.error('Zip creation error:', err);
    return null;
  }
}

// Main processing route - simplified
app.post('/api/process', upload.array('files', 50), async (req, res) => {
  const files = req.files;
  const { task, clusters, perConfig } = req.body;

  if (!files || !task || !clusters || !perConfig) {
    return res.status(400).json({ success: false, error: 'Missing required fields or files.' });
  }

  console.log('=== PROCESSING STARTED ===');
  console.log(`Task: ${task}, Files: ${files.length}, Clusters: ${clusters}, PerConfig: ${perConfig}, MinPart: ${minPartnum}, MaxPart: ${maxPartnum}, MinBand: ${minBandnum}, MaxBand: ${maxBandnum}`);

  try {
    // Step 1: Process files
    console.log('Step 1: Processing files...');
    const processedFiles = await processUploadedFilesOptimized(files, task);
    
    ensureDirectoryExists('./output-phases');

    // Step 2: Python clustering
    console.log('Step 2: Running Python clustering...');
    
    const pythonCommand = `python dna-phase-clustering.py --task ${task} --input-dir ${path.join('./input-data',task)} --output-dir output-phases --num-clusters ${clusters} --num-per-config ${perConfig} --minpart ${minPartnum} --maxpart ${maxPartnum} --minband ${minBandnum } --maxband ${maxBandnum} --scan-input`;
    
    const { stdout, stderr } = await execAsync(pythonCommand, {
      maxBuffer: 1024 * 1024 * 10 // Increased buffer size to 10MB
    });

    console.log('Python clustering completed');
    if (stderr && !stderr.includes('warning')) {
      console.warn('Python warnings:', stderr.slice(0, 500));
    }

    // Step 3: Generate theta files
    console.log('Step 3: Generating theta files...');
    const thetaSuccess = await generateThetaFilesOptimized(task);
    
    const thetaVerification = thetaSuccess ? verifyThetaFilesOptimized(task) : null;

    // Step 4: Create zip
    console.log('Step 4: Creating zip file...');
    const zipFilePath = await createZipFileOptimized(task);

    console.log('=== PROCESSING COMPLETED ===');

    res.json({
      success: true,
      message: 'Processing completed successfully',
      totalProcessedFiles: processedFiles.length,
      thetaGenerationSuccess: thetaSuccess,
      thetaVerification,
      zipCreated: !!zipFilePath,
      downloadUrl: zipFilePath ? `/download/${task}` : null
    });

  } catch (err) {
    console.error('Processing error:', err);
    
    const zipFilePath = await createZipFileOptimized(task);
    
    res.status(zipFilePath ? 200 : 500).json({
      success: !!zipFilePath,
      error: err.message,
      zipCreated: !!zipFilePath,
      downloadUrl: zipFilePath ? `/download/${task}` : null
    });
  }
});

// Download route
// Add this line after your existing routes but before app.listen():
app.use('/zipped-results', express.static(path.join(__dirname, 'zipped-results')));

// Also replace your existing /download/:task route with this improved version:
app.get('/download/:task', (req, res) => {
  const taskName = req.params.task;
  const zipFilePath = path.join(__dirname, 'zipped-results', `${taskName}_results.zip`);

  console.log(`Download requested for task: ${taskName}`);
  console.log(`Looking for file at: ${zipFilePath}`);

  if (!fs.existsSync(zipFilePath)) {
    console.error(`Zip file not found: ${zipFilePath}`);
    return res.status(404).json({ 
      error: 'Zip file not found',
      message: `No results found for task: ${taskName}`,
      expectedPath: zipFilePath
    });
  }

  try {
    const stat = fs.statSync(zipFilePath);
    console.log(`File found, size: ${stat.size} bytes`);
    
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${taskName}_results.zip"`);
    res.setHeader('Content-Length', stat.size);
    
    const fileStream = fs.createReadStream(zipFilePath);
    
    fileStream.on('error', (err) => {
      console.error('File stream error:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to read file' });
      }
    });
    
    fileStream.pipe(res);

  } catch (err) {
    console.error('Download error:', err);
    res.status(500).json({ error: 'Failed to download results', details: err.message });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});