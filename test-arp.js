const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

async function testArp() {
  try {
    const { stdout } = await execAsync('arp -a');
    const lines = stdout.split('\n');
    
    console.log('Total lines:', lines.length);
    console.log('');
    
    const arpMap = new Map();
    
    if (process.platform === 'win32') {
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // Try current regex
        const match = line.match(/\s+(\d+\.\d+\.\d+\.\d+)\s+([0-9a-fA-F\-]+)\s+(estático|dinámico|dynamic|static)/i);
        
        if (match) {
          const ip = match[1];
          const mac = match[2].replace(/-/g, ':').toLowerCase();
          const firstOctet = parseInt(ip.split('.')[0]);
          
          console.log(`Line ${i}: "${line}"`);
          console.log(`  -> Matched IP: ${ip}, MAC: ${mac}, Type: ${match[3]}`);
          console.log(`  -> First octet: ${firstOctet} (skip if >= 224)`);
          
          if (firstOctet < 224 && mac !== 'ff:ff:ff:ff:ff:ff' && !mac.includes('---')) {
            arpMap.set(ip, mac);
            console.log(`  -> ✓ Added to map`);
          } else {
            console.log(`  -> ✗ Skipped`);
          }
        } else if (line.trim() && !line.includes('Interfaz') && !line.includes('Dirección') && !line.includes('Tipo')) {
          console.log(`Line ${i}: "${line}" (NO MATCH)`);
        }
      }
    }
    
    console.log('\n=== Final ARP Map ===');
    for (const [ip, mac] of arpMap) {
      console.log(`${ip} -> ${mac}`);
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testArp();
