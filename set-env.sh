#!/usr/bin/env bash
#
# load_env.sh — export every key=value pair from a .env file into the
# current shell environment.
#
# Usage:
#   source load_env.sh [path-to-env-file]
#
# IMPORTANT: this script must be *sourced*, not executed, otherwise the
# exported variables only live in the child process and disappear as soon
# as the script exits.
#
#   source load_env.sh          # looks for ./.env
#   source load_env.sh config/.env.production
#
# Supports:
#   - blank lines and full-line comments (#...)
#   - optional "export " prefix already in the file
#   - inline comments after unquoted values (KEY=value # comment)
#   - single- and double-quoted values (quotes are stripped)
#   - values containing '=' signs
#
# Skips:
#   - malformed lines that don't look like KEY=VALUE

load_env() {
    local env_file="${1:-.env}"

    if [[ ! -f "$env_file" ]]; then
        echo "load_env: file not found: $env_file" >&2
        return 1
    fi

    local line key value
    while IFS= read -r line || [[ -n "$line" ]]; do
        # Strip leading/trailing whitespace.
        line="${line#"${line%%[![:space:]]*}"}"
        line="${line%"${line##*[![:space:]]}"}"

        # Skip blank lines and full-line comments.
        [[ -z "$line" || "$line" == \#* ]] && continue

        # Allow an optional leading "export ".
        [[ "$line" == export\ * ]] && line="${line#export }"

        # Must look like KEY=VALUE.
        [[ "$line" != *=* ]] && continue

        key="${line%%=*}"
        value="${line#*=}"

        # Trim whitespace around key.
        key="${key%"${key##*[![:space:]]}"}"

        # Validate key looks like a shell-safe identifier.
        if [[ ! "$key" =~ ^[A-Za-z_][A-Za-z0-9_]*$ ]]; then
            echo "load_env: skipping invalid key: $key" >&2
            continue
        fi

        # Trim leading whitespace around value.
        value="${value#"${value%%[![:space:]]*}"}"

        # If value starts with a quote, take everything up to the matching
        # closing quote as the value (anything after, e.g. an inline
        # comment, is discarded), and strip the quotes themselves.
        if [[ "$value" == \"* ]]; then
            local rest="${value:1}"
            value="${rest%%\"*}"
        elif [[ "$value" == \'* ]]; then
            local rest="${value:1}"
            value="${rest%%\'*}"
        else
            # Unquoted: strip a trailing inline comment ( " # ..."),
            # then trim trailing whitespace.
            value="${value%%[[:space:]]#*}"
            value="${value%"${value##*[![:space:]]}"}"
        fi

        export "$key=$value"
    done < "$env_file"
}

# If sourced with an argument, load it immediately.
# (If you just want the function defined for reuse, source this file
# with no argument and then call `load_env path/to/.env` yourself.)
if [[ "${BASH_SOURCE[0]}" != "${0}" ]]; then
    if [[ $# -gt 0 ]]; then
        load_env "$1"
    fi
else
    echo "This script must be sourced, not executed:" >&2
    echo "  source ${BASH_SOURCE[0]} [path-to-env-file]" >&2
    exit 1
fi