clear
echo "THIS FILE IS ONLY FOR INSTALLING THE REQUIREMENTS"
echo "AFTER INSTALLATION, IT WILL DELETE ITSELF!"
echo "UPDATING TERMUX"
apt update
echo "UPGRADE TERMUX PACKGES"
apt upgrade
echo "INSTALLING PIP"
pkg install git
echo "INSTALLING NODEJS"
pkg install nodejs
echo "INSTALLING YARN"
npm install -g yarn
echo "DOWNLOADING MODULES"
yarn
echo "REMOVE NODE_MODULES IMAGES"
termux-setup-storage
path="/storage/emulated/0/"
if [ ! -d "$path" ]; then
  echo "PATH DONT EXISTS: $path"
  exit 1
fi
find "$path" -type d -name "node_modules" | while read nm_path; do
  echo "$nm_path"
  find "$nm_path" -type f \( \
    -iname "*.gif" -o \
    -iname "*.svg" -o \
    -iname "*.webp" -o \
    -iname "*.bmp" -o \
    -iname "*.d.ts" \
  \) -print -delete
done
echo "START BOT"
rm -- "$0"
clear
sh start.sh