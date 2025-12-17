#!/bin/bash
caffeinate -d &

# Initialize cycle counter
counter=-1

RUST_TIMER="./target/release/working_hours"

while true; do
    ((counter++))

    total_seconds=$((counter * 300))
    total_minutes=$((total_seconds / 60))
    fractional_hours=$(echo "scale=1; $total_seconds / 3600" | bc)

    osascript -e 'tell application "Microsoft Teams" to activate'
    osascript -e 'tell application "System Events" to keystroke "2" using {command down}'

    clear
    echo
    printf "%s\n" \
    "╻ ╻┏━┓╺┳╸╻┏┳┓┏━╸" \
    "┃ ┃┣━┛ ┃ ┃┃┃┃┣╸ " \
    "┗━┛╹   ╹ ╹╹ ╹┗━╸"
    echo

    printf "\e[32m——————— System Information ———————\e[0m\n"
    echo    
    printf "\e[32mCyclical Progression:\e[0m [\e[34m$counter c\e[0m] [\e[34m$total_minutes m\e[0m] [\e[34m$fractional_hours h\e[0m]\n"

    # 👇 Rust Work Timer Output
    printf "\e[33m"
    $RUST_TIMER
    printf "\e[0m\n"

    echo
    /bin/echo -n "CPU Usage: " && top -l 1 | awk '/CPU usage/ {print $3}'
    /bin/echo -n "Memory Free: " && top -l 1 -s 0 | grep PhysMem | awk '{print $6}'
    echo
    /bin/echo -n "Internal IP Address: " && ipconfig getifaddr en0
    /bin/echo -n "External IP Address: " && curl -s icanhazip.com
    echo
    /bin/echo -n "Traffic Out: " && top -l 1 -s 0 | grep Networks | awk '{print $3}' FS=/ | awk '{print $1}'
    /bin/echo -n "Traffic In: " && top -l 1 -s 0 | grep Networks | awk '{print $2}' FS=/ | awk '{print $1}'
    echo

    printf "\e[32m————————— Top Processes —————————\e[0m\n"
    echo
    ps -arcwwwxo "command pid %cpu %mem" | head -11

    echo
    printf "\e[32mFidēlem esse in paucīs nōn vīsīs.\e[0m\n"
    printf "\e[32mGrātum esse minimīs beneficiīs.\e[0m\n"
    printf "\e[32mAfficī et solvi ab improbīs modicīsque rēbus.\e[0m\n"
    printf "\e[32mPeregrīnum esse in hortō, cum spē spectāre.\e[0m\n"

    sleep 300
done
