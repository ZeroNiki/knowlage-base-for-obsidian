---
title: "getchar"
aliases: []
tags:
  - area/development
  - topic/c
type: reference
status: stable
created: 2024-09-19
updated: 2026-10-23
---
```c
#include <stdio.h>

int main()
{
	int ch, i = 0;
	char str[150];
	printf("Enter the characters\n");

	do {
		// takes character, number, etc
		// from the user
		ch = getchar();

		// store the ch into str[i]
		str[i] = ch;

		// increment loop by 1
		i++;

		// ch is not equal to '\n'
	} while (ch != '\n');

	printf("Entered characters are %s ", str);
	return 0;
}

```