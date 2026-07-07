#!/bin/sh

tar -czf BluebelStudio-linux.tar.gz pack-linux/
tar -czf BluebelStudio-mac.tar.gz pack-mac/
zip -r BluebelStudio-windows.zip pack-windows
