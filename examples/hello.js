#!/usr/bin/env node

function greet(name) {
    return `Olá, ${name}!`;
}

function main() {
    console.log(greet("bluebel Studio"));
    console.log("=".repeat(30));
    
    // Teste de loop
    for (let i = 1; i <= 5; i++) {
        console.log(`Contagem: ${i}`);
    }
    
    // Teste de cálculo
    const result = Array.from({length: 10}, (_, i) => i + 1).reduce((a, b) => a + b);
    console.log(`\nSoma de 1 a 10: ${result}`);
}

main();
