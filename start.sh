#!/usr/bin/env bash

# change current dir to project's dir
# IMPORTANT, otherwise cant reach files
project_dir="$(dirname "$(realpath "$0")")"
echo "Moving to project dir: $project_dir"
cd "$project_dir"

echo "Installing project dependencies.."
npm install

echo "Starting express app..."
node s3client.js