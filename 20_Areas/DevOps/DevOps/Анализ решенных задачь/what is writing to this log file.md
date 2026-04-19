---
tags: [tasks, devops, python, bash, logs]
status: in progress 
created: 2026-04-18
---

# "Saint John": what is writing to this log file?
- **Level:** Easy
- **Description:** A developer created a testing program that is continuously writing to a log file _/var/log/bad.log_ and filling up disk. You can check for example with tail -f /var/log/bad.log.  
This program is no longer needed. Find it and terminate it. Do not delete the log file.

## Решение
- Переходим под root sudo -i
- выполняем комманду lsof \[путь к файлу\]
> [!abstract] Что делает эта комманда
>  Lsof выводит в файл стандартного вывода информацию о файлах, открытых процессами

- Находим pid процесса и убиваем его коммандой kill (по дефолту использует SIGTERM (15))
> [!abstract] Key kill signals
> While there are over 60 signals available on most Linux systems, the most common ones used with kill include: 
	>  SIGTERM (15): The default signal. It requests a process to terminate gracefully, allowing it to perform cleanup tasks like saving data or closing open files before exiting.
	>  SIGKILL (9): The "force kill" signal. It terminates a process immediately without any cleanup. This signal cannot be caught, blocked, or ignored by the process.
	>  SIGHUP (1): "Hangup." Often used to tell a daemon or service to reload its configuration files without stopping the process.
	>  SIGINT (2): "Interrupt." Equivalent to pressing Ctrl+C in a terminal; it asks the process to interrupt its current activity.
	>  SIGSTOP (19): Pauses a process's execution. Like SIGKILL, it cannot be ignored or handled by the process.
	>  SIGCONT (18): Resumes a process that was previously stopped by SIGSTOP