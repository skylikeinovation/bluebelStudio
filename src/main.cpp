// BluebelStudio C++ Qt Template

#include <iostream>

#include <QApplication>
#include <QMainWindow>
#include <QLabel>

int main(int argc, char *argv[])
{
    QApplication app(argc, argv);

    QMainWindow window;

    auto *label = new QLabel("Olá, Qt!", &window);
    window.setCentralWidget(label);

    window.resize(800, 600);
    window.show();

    std::cout << "Aplicação iniciada!" << std::endl;

    return app.exec();
}