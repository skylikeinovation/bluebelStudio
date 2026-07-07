CXX = g++

SRC = src/main.cpp

LINUX_TARGET = bin/bluebelstudio
WINDOWS_TARGET = bin/bluebelStudio.exe
MAC_TARGET = bin/bluebelstudio-mac

linux:
	mkdir -p bin
	$(CXX) $(SRC) -o $(LINUX_TARGET) $(shell pkg-config --cflags --libs Qt6Widgets)

windows:
	mkdir -p bin
	x86_64-w64-mingw32-g++ $(SRC) -o $(WINDOWS_TARGET)

mac:
	mkdir -p bin
	clang++ $(SRC) -o $(MAC_TARGET)

release-linux: linux
	rm -rf dist/pack-linux
	mkdir -p dist/pack-linux
	cp bin/bluebelstudio dist/pack-linux/
	cp -r libs dist/pack-linux/
	tar -czf dist/BluebelStudio-linux.tar.gz -C dist pack-linux

release-windows: windows
	zip -r dist/BluebelStudio-windows.zip bin/bluebelStudio.exe

release-mac: mac
	tar -czf dist/BluebelStudio-mac.tar.gz bin/bluebelstudio-mac

clean:
	rm -rf bin/*
	rm -rf dist/*