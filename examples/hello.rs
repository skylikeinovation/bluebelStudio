use std::fmt::Write;

fn greet(name: &str) -> String {
    format!("Olá, {}!", name)
}

fn main() {
    println!("{}", greet("bluebel Studio"));
    println!("{}", "=".repeat(30));
    
    // Teste de loop
    for i in 1..=5 {
        println!("Contagem: {}", i);
    }
    
    // Teste de cálculo
    let result: i32 = (1..=10).sum();
    println!("\nSoma de 1 a 10: {}", result);
}
