const std = @import("std");

pub fn main() !void {
    const stdout = std.io.getStdOut().writer();

    try stdout.print("======================\n", .{});
    try stdout.print("bluebel Studio + Zig\n", .{});
    try stdout.print("======================\n\n", .{});

    // Teste de variáveis
    const nome = "Belbel1124";
    try stdout.print("Olá, {s}!\n\n", .{nome});

    // Teste de loop
    var i: u32 = 1;
    while (i <= 5) : (i += 1) {
        try stdout.print("Contagem: {d}\n", .{i});
    }

    // Teste de cálculo
    var soma: u32 = 0;
    var j: u32 = 1;
    while (j <= 10) : (j += 1) {
        soma += j;
    }
    try stdout.print("\nSoma de 1 a 10: {d}\n", .{soma});
}
// TODO: // TODO: 