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

const execAsync = promisify(exec);
const app = express();
const port = 3001;

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
function generateTaskSet(targetUtil, minWithin, maxWithin, cores, maxPart, currentTaskName) {
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
  
  target = numCores * target;
  let remainingUtil = target;
  let id = 0;
  
  console.log(`Generating task set with target utilization: ${target}`);
  
  while (remainingUtil > 0) {
    id++;
    
    // Random task name selection from available task names
    const nameIndex = Math.floor(Math.random() * availableTaskNames.length);
    const selectedTaskName = availableTaskNames[nameIndex];
    
    // Generate random utilization within bounds
    let utilization = Math.random() * (max - min) + min;
    
    // Don't exceed remaining utilization
    if (utilization > remainingUtil) {
      utilization = remainingUtil;
    }
    
    const fs = require('fs');
    let wcet;
    const filenameout = path.join("output-phases", selectedTaskName, "15_360", "wcet.txt");
    
    // Check if the wcet.txt file exists for the selected task
    if (!fs.existsSync(filenameout)) {
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
      const content = fs.readFileSync(filenameout, 'utf-8').trim();
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

// Modified task generation endpoint - pass currentTaskName but don't add it to the array
app.post('/api/generate-tasks', (req, res) => {
  try {
    const { targetUtil, minWithin, maxWithin, cores, maxPart, taskName, exportFormat } = req.body;
    
    console.log('Received request body:', req.body);
    
    // Validate required parameters
    if (targetUtil === undefined || minWithin === undefined || maxWithin === undefined || 
        cores === undefined || maxPart === undefined) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required parameters: targetUtil, minWithin, maxWithin, cores, maxPart',
        received: { targetUtil, minWithin, maxWithin, cores, maxPart, taskName }
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
    const maxPartNum = parseInt(maxPart);
    
    if (isNaN(targetUtilNum) || isNaN(minWithinNum) || isNaN(maxWithinNum) || 
        isNaN(coresNum) || isNaN(maxPartNum)) {
      return res.status(400).json({ 
        success: false, 
        error: 'All parameters must be valid numbers'
      });
    }
    
    console.log('=== TASK GENERATION STARTED ===');
    console.log(`Parameters: targetUtil=${targetUtil}, minWithin=${minWithin}, maxWithin=${maxWithin}, cores=${cores}, maxPart=${maxPart}`);
    console.log(`Available task names: ${availableTaskNames.join(', ')}`);
    
    // Generate task set (don't add taskName to the stored names)
    const tasks = generateTaskSet(targetUtil, minWithin, maxWithin, cores, maxPart, taskName);
    
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
        period: parseFloat(task.period.toFixed(6))
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

function generateTaskSet(targetUtil, minWithin, maxWithin, cores, maxPart, taskName) {
  const tasks = [];
  
  // Add the current taskName to savedTaskNames if it's not already there (no repeats)
  if (taskName && !savedTaskNames.includes(taskName)) {
    savedTaskNames.push(taskName);
    console.log(`Added new task name: ${taskName}`);
  }
  
  // Remove duplicates and use the array
  const availableTaskNames = [...new Set(savedTaskNames)];
  
  // If no task names available, return empty task set
  if (availableTaskNames.length === 0) {
    console.warn('No task names available for task generation');
    return [];
  }
  
  // Convert string inputs to numbers (matching Python input() behavior)
  target = parseFloat(targetUtil);
  const min = parseFloat(minWithin);
  const max = parseFloat(maxWithin);
  const numCores = parseInt(cores);
  const maxPartitions = parseInt(maxPart);
  
  target=numCores*target;
  let remainingUtil = target;
  let id = 0;
  
  console.log(`Generating task set with target utilization: ${target}`);
  console.log(`Available task names: ${availableTaskNames.join(', ')}`);
  
  while (remainingUtil > 0) {
    id++;
    
    // Random task name selection from available task names
    const nameIndex = Math.floor(Math.random() * availableTaskNames.length);
    const selectedTaskName = availableTaskNames[nameIndex];
    
    // Generate random utilization within bounds
    let utilization = Math.random() * (max - min) + min;
    
    // Don't exceed remaining utilization
    if (utilization > remainingUtil) {
      utilization = remainingUtil;
    }
    
    const fs = require('fs');
    let wcet;
    const filenameout = path.join("output-phases", selectedTaskName, "15_360", "wcet.txt");
    
    // Check if the wcet.txt file exists for the selected task
    if (!fs.existsSync(filenameout)) {
      console.warn(`WCET file not found for task ${selectedTaskName}, trying alternative path...`);
      // Try alternative path or use a default value
      const alternativePath = path.join("output-phases", selectedTaskName, "1023_1008", "wcet.txt");
      if (fs.existsSync(alternativePath)) {
        const content = fs.readFileSync(alternativePath, 'utf-8').trim();
        wcet = parseFloat(content);
      } else {
        console.error(`No WCET file found for task ${selectedTaskName}, skipping this task`);
        continue; // Skip this iteration and try again
      }
    } else {
      const content = fs.readFileSync(filenameout, 'utf-8').trim();
      wcet = parseFloat(content);
    }

    // Validate wcet value
    if (isNaN(wcet) || wcet <= 0) {
      console.error(`Invalid WCET value for task ${selectedTaskName}: ${wcet}, skipping this task`);
      continue; // Skip this iteration and try again
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
    const { targetUtil, minWithin, maxWithin, cores, maxPart, taskName, exportFormat } = req.body;
    
    console.log('Received request body:', taskName, req.body);
    
    // Validate required parameters
    if (targetUtil === undefined || minWithin === undefined || maxWithin === undefined || 
        cores === undefined || maxPart === undefined || !taskName) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required parameters: targetUtil, minWithin, maxWithin, cores, maxPart, taskName',
        received: { targetUtil, minWithin, maxWithin, cores, maxPart, taskName }
      });
    }
    
    // Additional validation
    const targetUtilNum = parseFloat(targetUtil);
    const minWithinNum = parseFloat(minWithin);
    const maxWithinNum = parseFloat(maxWithin);
    const coresNum = parseInt(cores);
    const maxPartNum = parseInt(maxPart);
    
    if (isNaN(targetUtilNum) || isNaN(minWithinNum) || isNaN(maxWithinNum) || 
        isNaN(coresNum) || isNaN(maxPartNum)) {
      return res.status(400).json({ 
        success: false, 
        error: 'All parameters must be valid numbers'
      });
    }
    
    console.log('=== TASK GENERATION STARTED ===');
    console.log(`Parameters: targetUtil=${targetUtil}, minWithin=${minWithin}, maxWithin=${maxWithin}, cores=${cores}, maxPart=${maxPart}`);
    
    // Generate task set
    const tasks = generateTaskSet(targetUtil, minWithin, maxWithin, cores, maxPart, taskName);
    
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
        wcet: task.wcet
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
  console.log(`Task: ${task}, Files: ${files.length}, Clusters: ${clusters}, PerConfig: ${perConfig}`);

  try {
    // Step 1: Process files
    console.log('Step 1: Processing files...');
    const processedFiles = await processUploadedFilesOptimized(files, task);
    
    ensureDirectoryExists('./output-phases');

    // Step 2: Python clustering
    console.log('Step 2: Running Python clustering...');
    
    const pythonCommand = `python dna-phase-clustering.py --task ${task} --input-dir ${path.join('./input-data',task)} --output-dir output-phases --num-clusters ${clusters} --num-per-config ${perConfig || 5} --scan-input`;
    
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