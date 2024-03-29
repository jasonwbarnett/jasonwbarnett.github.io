---
title: The Ultimate MySQL Backup Script in Bash
author: Jason Barnett
layout: post
categories:
  - Bash
  - Linux
  - MySQL
---

So, just as many smart people in the world do, when I needed a MySQL backup
script, I first googled it. To my surprise, I couldn’t find a single script that
fit my needs. They were either far too basic (e.g. simple mysqldump without any
kind of error reporting) or an entire program that needed to be deployed,
configured and setup (e.g. Zmanda). I set out to write a bash script that was
easy enough for someone to use who didn’t have the depth and knowledge of a
Linux/Bash, but also could be used by a sysadmin who wanted something simple and
quick to deploy. I think that I’ve accomplished just that, but I’ll let you be
the judge. The source code (at the time of writing) can be found below or the
latest at [github][1].

{% highlight bash %}
#!/bin/bash
# Author: Jason Barnett <J@sonBarnett.com>
MYSQL_BACKUP_VERSION=1.0

############
## README ##
############
##
##  Assumptions this script makes:
##  ------------------------------
##    -The script itself is run by root
##    -root's home is /root
##    -MySQL Server version is >= 5.1.2 (That's when the whole --routines switch was added to mysqldump)
##    -crontab is configured to email you, help can be found here:
##      https://www.cyberciti.biz/faq/linux-unix-crontab-change-mailto-settings/
##
##  How to use this script:
##  -----------------------
##    Simply run this script as is once and it should ask all the right questions and place them in an easy
##    to reference config file so it never needs to ask again.
##
##    I suggest setting up a cronjob with this script once you've confirmed it's running as expected
##    and then putting it in your crontab, e.g.:
##
##      0 2 * * * /path/to/mysql-backup.sh > /dev/null
##
##    The reason behind my suggestion is that most people have (or sould have) cron setup so that it only
##    emails them when there is any output (both stdout or stderr) from the script/command/etc... I've
##    written this script to output to stderr when you need to be notified by email about a problem, e.g.
##    it's unable to grab a full list of databases, or it can't authenticate, etc... All of the stdout output
##    can be safely ignored. In order for this to work properly though, it requires cron daemon to be configured
##    properly so you can receive email from it when things go awry.
##
###########

## Functions ##
###############

function ask_question {
    question=$1
    read -p "$question: "
    echo $REPLY
}

function ask_yes_no {
    question=$1
    read -p "$question: [y/n] "
    local answer=$(echo $REPLY | tr '[:upper:]' '[:lower:]')

    while [[ "${answer}" != "yes" && "${answer}" != "no" && "${answer}" != "y" && "${answer}" != "n" ]];do
        read -p "y/n only please... $question: [y/n] "
        answer=$(echo $REPLY | tr '[:upper:]' '[:lower:]')
    done

    [[ "${answer}" == "yes" || "${answer}" == "y" ]] && echo true || echo false
}

function msg {
    echo "$1"
}

function err_msg {
    echo "$1" 1>&2
}

function fail_msg {
    echo "$1" 1>&2
    exit 1
}

function update_config {
    local config_property config_value
    config_property=$(echo $1 | awk -F= '{print $1}')
    config_value=$(echo $1 | awk -F= '{print $2}')

    [[ ! -d ${HOME}/.config/mysql-backup ]] && mkdir -p ${HOME}/.config/mysql-backup
    chmod 0700 ${HOME}/.config/mysql-backup

    [[ ! -e ${HOME}/.config/mysql-backup/config ]] && touch ${HOME}/.config/mysql-backup/config
    chmod 0600 ${HOME}/.config/mysql-backup/config

    sed -i "/^${config_property}=/d" ${HOME}/.config/mysql-backup/config
    echo "${config_property}=${config_value}" >> ${HOME}/.config/mysql-backup/config
}

function get_mysql_credentials {
    MYSQL_USER=$(ask_question "MySQL Username")
    [[ -z $MYSQL_USER ]] && exit 1
    MYSQL_HOST=$(ask_question "MySQL Host")
    MYSQL_PASS=$(ask_question "MySQL Password")
    [[ -n ${MYSQL_USER} && -n ${MYSQL_HOST} && -n ${MYSQL_PASS} ]] || {
        fail_msg "You have not specified a MySQL Username, Host and/or Password"
    }

    check_mysql_credentials
    update_config "MYSQL_USER=${MYSQL_USER}"
    update_config "MYSQL_HOST=${MYSQL_HOST}"
    update_config "MYSQL_PASS=${MYSQL_PASS}"
}

function check_mysql_credentials {
    temp_file=$(mktemp /tmp/.mysql-backup.XXXXXX)
    local good_credentials=

    mysql -u${MYSQL_USER} -h${MYSQL_HOST} -p${MYSQL_PASS} \
        -BNe 'show databases;' &> ${temp_file} && good_credentials=true

    if [[ -z $good_credentials ]];then
        fail_msg "You have a bad MySQL Username, Host and/or Password"
    fi

    rm -f ${temp_file}
}

function ask_about_routines {
    ROUTINES=$(ask_yes_no "Dump stored routines?")
    update_config "ROUTINES=${ROUTINES}"
}

function get_backup_destination {
    BACKUP_DEST=$(ask_question "Choose a backup destination, absolute path only")

    while [[ $(echo ${BACKUP_DEST} | egrep '^((\/[a-zA-Z0-9]+(_[a-zA-Z0-9]+)*(\-[a-zA-Z0-9]+)*)+)$') == "" ]];do
        BACKUP_DEST=$(ask_question "I said absolute path only...")
    done

    update_config "BACKUP_DEST=${BACKUP_DEST}"
}

## MAIN SCRIPT ##
#################

# Check if mysql server even exists on the machine and exit if it's not.
[[ -x /usr/bin/mysqld_safe ]] || { echo "MySQL-Server is not installed on this machine."; exit 0; }

# Set HOME and load config (We set HOME here because most likely we're running from the crontab and HOME isn't set)
HOME=/root
[[ -e ${HOME}/.config/mysql-backup/config ]] && . ${HOME}/.config/mysql-backup/config

# Check for MySQL credentials
[[ -n ${MYSQL_USER} && -n ${MYSQL_HOST} && -n ${MYSQL_PASS} ]] && check_mysql_credentials || get_mysql_credentials

# Should we dump routines?
[[ -n ${ROUTINES} && (${ROUTINES} == "true" || ${ROUTINES} == "false") ]] || ask_about_routines
[[ ${ROUTINES} == "true" ]] && ROUTINES='--routines' || ROUTINES=

# Check for backup destination, create it if it doesn't exist, and set the correct permissions
[[ -n ${BACKUP_DEST} ]] || get_backup_destination
[[ ! -d ${BACKUP_DEST} ]] && mkdir -p ${BACKUP_DEST}
chown root:root -R ${BACKUP_DEST}
chmod 0700 ${BACKUP_DEST}

# Locate gzip binary and try to use pigz (multi-threaded gzip), or fallback and use gzip
GZIP=`which pigz 2> /dev/null`
[[ -z ${GZIP} ]] && { GZIP=`which gzip 2> /dev/null`; msg "INFO: You don't have pigz installed, using gzip instead."; msg "      This is not a big deal, pigz simply speeds up the backup process."; }

# Locate mysqldump binary
MYSQLDUMP=`which mysqldump 2> /dev/null`
[[ -z ${MYSQLDUMP} ]] && fail_msg "Unable to locate \"mysqldump\". Make sure it's in your \$PATH."

# Get a list of all databases
DBs="$(mysql -u${MYSQL_USER} -h${MYSQL_HOST} -p${MYSQL_PASS} -BNe 'show databases;' | egrep -v '^(information_schema)$')"
mysql_status=$?

[[ $mysql_status != "0" ]] && fail_msg "There was an issue grabbing a complete list of databases to backup."

backup_failed=
for db in ${DBs};do
    FILE="${BACKUP_DEST}/${db}.sql.gz"
    [ -f ${FILE}.2 ] && rm -f ${FILE}.2
    [ -f ${FILE}.1 ] && mv ${FILE}.1 ${FILE}.2
    [ -f ${FILE}.0 ] && mv ${FILE}.0 ${FILE}.1
    [ -f ${FILE} ] && mv ${FILE} ${FILE}.0
    echo -n "Backing up $db... "
    ${MYSQLDUMP} -u${MYSQL_USER} -h${MYSQL_HOST} -p${MYSQL_PASS} $ROUTINES -B ${db} | $GZIP -9 > ${FILE}
    if [[ $? == "0" ]];
        then
            msg Success!
        else
            err_msg Failed!
            backup_failed=true
            failed_dbs="$db $failed_dbs"
    fi
done

[[ $backup_failed == "true" ]] && fail_msg "There was an issue backing up the following databases: ${failed_dbs}"
{% endhighlight %}

[1]: https://github.com/jasonwbarnett/sysadmin-scripts/blob/master/mysql-backup.sh
