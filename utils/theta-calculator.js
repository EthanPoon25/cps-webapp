const { spawn, exec } = require('child_process');
const path = require('path');
const fs = require('fs').promises;

async function calculateThetas(outputDir) {
    try {
        console.log('Starting theta calculation...');
        
        // Step 1: Compile the C code
        await compileCode();
        
        // Step 2: Run the DNA tool
        await runDnaTool();
        
        // Step 3: Verify theta files were created
        const verified = await verifyThetaFiles(outputDir);
        
        return verified;
    } catch (error) {
        console.error('Theta calculation failed:', error);
        return false;
    }
}

function compileCode() {
    return new Promise((resolve, reject) => {
        const makeProcess = spawn('make', [], { 
            cwd: path.join(__dirname, '../calculate-thetas'),
            stdio: 'inherit'
        });
        
        makeProcess.on('close', (code) => {
            if (code === 0) {
                console.log('C code compiled successfully');
                resolve();
            } else {
                reject(new Error(`Make failed with code ${code}`));
            }
        });
        
        makeProcess.on('error', (error) => {
            reject(error);
        });
    });
}

function runDnaTool() {
    return new Promise((resolve, reject) => {
        const dnaProcess = spawn('./dna_tool', [], { 
            cwd: path.join(__dirname, '../'),
            stdio: 'inherit'
        });
        
        dnaProcess.on('close', (code) => {
            if (code === 0) {
                console.log('DNA tool executed successfully');
                resolve();
            } else {
                reject(new Error(`DNA tool failed with code ${code}`));
            }
        });
        
        dnaProcess.on('error', (error) => {
            reject(error);
        });
    });
}

async function verifyThetaFiles(outputDir) {
    try {
        // Check if theta files exist in the expected directories
        const taskDirs = await fs.readdir(outputDir);
        
        for (const taskDir of taskDirs) {
            const taskPath = path.join(outputDir, taskDir);
            const stat = await fs.stat(taskPath);
            
            if (stat.isDirectory()) {
                const subDirs = await fs.readdir(taskPath);
                
                for (const subDir of subDirs) {
                    const subDirPath = path.join(taskPath, subDir);
                    const subStat = await fs.stat(subDirPath);
                    
                    if (subStat.isDirectory()) {
                        const thetaFile = path.join(subDirPath, 'theta.txt');
                        
                        try {
                            await fs.access(thetaFile);
                            console.log(`✓ Found theta.txt in ${subDirPath}`);
                        } catch {
                            console.log(`✗ Missing theta.txt in ${subDirPath}`);
                            return false;
                        }
                    }
                }
            }
        }
        
        return true;
    } catch (error) {
        console.error('Error verifying theta files:', error);
        return false;
    }
}

module.exports = { calculateThetas };