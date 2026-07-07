CXX = g++

SRC = src/main.cpp

BIN_DIR = bin
DIST_DIR = dist

LINUX_TARGET = $(BIN_DIR)/bluebelstudio
WINDOWS_TARGET = $(BIN_DIR)/bluebelStudio.exe
MAC_TARGET = $(BIN_DIR)/bluebelstudio-mac

QT_CFLAGS = $(shell pkg-config --cflags Qt6Widgets)
QT_LIBS = $(shell pkg-config --libs Qt6Widgets)

all: linux

linux:
	mkdir -p $(BIN_DIR)
	$(CXX) $(SRC) -o $(LINUX_TARGET) $(QT_CFLAGS) $(QT_LIBS)

release-linux: linux
	rm -rf $(DIST_DIR)/pack-linux
	mkdir -p $(DIST_DIR)/pack-linux/libs

	cp $(LINUX_TARGET) $(DIST_DIR)/pack-linux/

	cp $$(pkg-config --variable=libdir Qt6Core)/libQt6Core.so.6 $(DIST_DIR)/pack-linux/libs/
	cp $$(pkg-config --variable=libdir Qt6Gui)/libQt6Gui.so.6 $(DIST_DIR)/pack-linux/libs/
	cp $$(pkg-config --variable=libdir Qt6Widgets)/libQt6Widgets.so.6 $(DIST_DIR)/pack-linux/libs/

	tar -czf $(DIST_DIR)/BluebelStudio-linux.tar.gz -C $(DIST_DIR) pack-linux


windows:
	mkdir -p $(BIN_DIR)
	x86_64-w64-mingw32-g++ $(SRC) -o $(WINDOWS_TARGET)


release-windows: windows
	rm -rf $(DIST_DIR)/pack-windows
	mkdir -p $(DIST_DIR)/pack-windows

	cp $(WINDOWS_TARGET) $(DIST_DIR)/pack-windows/

	zip -r $(DIST_DIR)/BluebelStudio-windows.zip -j $(DIST_DIR)/pack-windows/*


mac:
	mkdir -p $(BIN_DIR)
	clang++ $(SRC) -o $(MAC_TARGET)


release-mac: mac
	rm -rf $(DIST_DIR)/pack-mac
	mkdir -p $(DIST_DIR)/pack-mac

	cp $(MAC_TARGET) $(DIST_DIR)/pack-mac/

	tar -czf $(DIST_DIR)/BluebelStudio-mac.tar.gz -C $(DIST_DIR) pack-mac


run: linux
	./$(LINUX_TARGET)


clean:
	rm -rf $(BIN_DIR)
	rm -rf $(DIST_DIR)


.PHONY: all linux release-linux windows release-windows mac release-mac run clean