#!/usr/bin/env python3

def greet(name):
    return f"Olá, {name}!"

def main():
    print(greet("bluebel Studio"))
    print("=" * 30)
    
    # Teste de loop
    for i in range(1, 6):
        print(f"Contagem: {i}")
    
    # Teste de cálculo
    result = sum(range(1, 11))
    print(f"\nSoma de 1 a 10: {result}")

if __name__ == "__main__":
    main()
