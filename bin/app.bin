// BluebelStudio C++ Qt Template

#include <iostream>

// Qt do sistema ou do SDK local
#include "../libs/QtWidgets/QApplication"
#include "../libs/QtWidgets/QMainWindow"
#include "../libs/QtWidgets/QLabel"


int main(int argc, char *argv[])
{
    QApplication app(argc, argv);

    QMainWindow window;

    QLabel label("Olá, Qt!", &window);
    window.setCentralWidget(&label);

    window.resize(800, 600);
    window.show();

    std::cout << "Aplicação iniciada!" << std::endl;

    return app.exec();
}
