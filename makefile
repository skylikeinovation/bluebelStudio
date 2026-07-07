CXX = g++

SRC = src/main.cpp

BIN_DIR = bin
DIST_DIR = dist

LINUX_BIN = $(BIN_DIR)/bluebelstudio
WINDOWS_BIN = $(BIN_DIR)/bluebelStudio.exe
MAC_BIN = $(BIN_DIR)/bluebelstudio-mac

QT = Qt6Widgets


linux:
	mkdir -p $(BIN_DIR)
	$(CXX) $(CXXFLAGS) $(SRC) -o $(LINUX_TARGET) $$(pkg-config --cflags --libs Qt6Widgets)


windows:
	mkdir -p $(BIN_DIR)
	$(CXX) $(CXXFLAGS) $(SRC) -o $(WINDOWS_TARGET) $$(pkg-config --cflags --libs Qt6Widgets)


mac:
	mkdir -p $(BIN_DIR)
	clang++ $(CXXFLAGS) $(SRC) -o $(MAC_TARGET) $$(pkg-config --cflags --libs Qt6Widgets)
release-linux: linux
	rm -rf $(DIST_DIR)/pack-linux
	mkdir -p $(DIST_DIR)/pack-linux
	cp $(LINUX_BIN) $(DIST_DIR)/pack-linux/
	tar -czf $(DIST_DIR)/BluebelStudio-linux.tar.gz -C $(DIST_DIR) pack-linux


release-windows: windows
	rm -rf $(DIST_DIR)/pack-windows
	mkdir -p $(DIST_DIR)/pack-windows
	cp $(WINDOWS_BIN) $(DIST_DIR)/pack-windows/
	zip -r $(DIST_DIR)/BluebelStudio-windows.zip $(DIST_DIR)/pack-windows


release-mac: mac
	rm -rf $(DIST_DIR)/pack-mac
	mkdir -p $(DIST_DIR)/pack-mac
	cp $(MAC_BIN) $(DIST_DIR)/pack-mac/
	tar -czf $(DIST_DIR)/BluebelStudio-mac.tar.gz -C $(DIST_DIR) pack-mac


clean:
	rm -rf $(BIN_DIR)
	rm -rf $(DIST_DIR)


.PHONY: linux windows mac release-linux release-windows release-mac clean