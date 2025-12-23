#!/usr/bin/env node

// Test simple del ping usando librería ping
const ping = require('ping');

async function testPing(ip) {
  console.log(`Testing ping to ${ip}...`);
  try {
    const res = await ping.promise.probe(ip, {
      timeout: 2,
    });
    console.log(`  Result: ${res.alive ? '✓ UP' : '✗ DOWN'}`);
    return res.alive;
  } catch (error) {
    console.log(`  Result: ✗ DOWN (error: ${error.message})`);
    return false;
  }
}

async function main() {
  console.log('🔧 Scanner Test - Testing basic connectivity\n');
  
  // Test common IPs
  const testIps = [
    '192.168.1.1',      // Router (más probable)
    '192.168.0.1',      // Router alternativo
    '127.0.0.1',        // Localhost (siempre up)
    '192.168.1.2',      // Próxima IP
    '192.168.1.100',    // PC remoto
  ];

  let upCount = 0;
  for (const ip of testIps) {
    const isUp = await testPing(ip);
    if (isUp) upCount++;
  }

  console.log(`\n✅ Test completado - ${upCount} hosts UP`);
  if (upCount === 0) {
    console.log('⚠️  Ningún dispositivo está alcanzable.');
    console.log('   Posibles problemas:');
    console.log('   1. Tu red no es 192.168.1.x');
    console.log('   2. El firewall bloquea pings');
    console.log('   3. No hay otros dispositivos en la red');
  }
}

main().catch(console.error);
