#!/usr/bin/env bash

# TODO: Use pnpm m ls --only-projects --json

# Exit immediately if a command exits with a non-zero status
set -e

# Function to execute a command in a specified directory
execute_in_directory() {
    local target_dir=$1
    shift
    local command=$@

    # Save the current directory
    local original_dir=$(pwd)

    # Change to the target directory
    cd "$target_dir" || { echo "Failed to change directory"; return 1; }

    # Execute the command
    $command

    # Return to the original directory
    cd "$original_dir"
}


prompt_and_release() {
    local package=$1

    # Prompt the user with multiple choices
    echo "[package: $1] Please choose an option:"
    echo "1) release"
    echo "2) release:minor"
    echo "3) release:commit"
    echo "4) none"
    read -p "Enter your choice (1/2/3/4): " user_choice

    case $user_choice in
        1)
            echo "You chose: release"
            execute_in_directory "packages/$package" pnpm run release
            ;;
        2)
            echo "You chose: release:minor"
            execute_in_directory "packages/$package" pnpm run release:minor
            ;;
        3)
            echo "You chose: release:commit"
            execute_in_directory "packages/$package" pnpm run release:commit
            ;;
        *)
            ;;
    esac
}

prompt_and_release "core"
prompt_and_release "adapter-express"
prompt_and_release "adapter-cloudflare"
prompt_and_release "adapter-fastify"
prompt_and_release "adapter-h3"
prompt_and_release "adapter-hattip"
prompt_and_release "adapter-hono"
prompt_and_release "adapter-webroute"
prompt_and_release "adapter-elysia"
prompt_and_release "universal-middleware"
