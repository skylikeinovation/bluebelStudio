CXX = g++

SRC = src/main.cpp

BIN_DIR = bin
DIST_DIR = dist

LINUX_TARGET = $(BIN_DIR)/bluebelstudio
WINDOWS_TARGET = $(BIN_DIR)/bluebelStudio.exe
MAC_TARGET = $(BIN_DIR)/bluebelstudio-mac

QT = Qt6Widgets

all: linux


linux:
	mkdir -p $(BIN_DIR)
	$(CXX) $(SRC) -o $(LINUX_TARGET) $$(pkg-config --cflags --libs $(QT))


windows:
	mkdir -p $(BIN_DIR)
	$(CXX) $(SRC) -o $(WINDOWS_TARGET) $$(pkg-config --cflags --libs $(QT))


mac:
	mkdir -p $(BIN_DIR)
	$(CXX) $(SRC) -o $(MAC_TARGET) $$(pkg-config --cflags --libs $(QT))


release-linux: linux
	rm -rf $(DIST_DIR)/pack-linux
	mkdir -p $(DIST_DIR)/pack-linux

	cp $(LINUX_TARGET) $(DIST_DIR)/pack-linux/

	tar -czf $(DIST_DIR)/BluebelStudio-linux.tar.gz \
		-C $(DIST_DIR) pack-linux


release-windows: windows
	rm -rf $(DIST_DIR)/pack-windows
	mkdir -p $(DIST_DIR)/pack-windows

	cp $(WINDOWS_TARGET) $(DIST_DIR)/pack-windows/

	zip -r $(DIST_DIR)/BluebelStudio-windows.zip \
		$(DIST_DIR)/pack-windows


release-mac: mac
	rm -rf $(DIST_DIR)/pack-mac
	mkdir -p $(DIST_DIR)/pack-mac

	cp $(MAC_TARGET) $(DIST_DIR)/pack-mac/

	tar -czf $(DIST_DIR)/BluebelStudio-mac.tar.gz \
		-C $(DIST_DIR) pack-mac


run: linux
	./$(LINUX_TARGET)


clean:
	rm -rf $(BIN_DIR)
	rm -rf $(DIST_DIR)


.PHONY: all linux windows mac release-linux release-windows release-mac run clean