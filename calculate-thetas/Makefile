# Makefile for dna_tool
CC = gcc
CFLAGS = -Wall -Wextra -std=c99 -O2 -g
TARGET = ../dna_tool
SOURCES = dna_tool.c
OBJECTS = $(SOURCES:.c=.o)

# Add math library and any other needed libraries
LIBS = -lm

.PHONY: all clean install test

all: $(TARGET)

$(TARGET): $(OBJECTS)
	@echo "🔨 Linking $(TARGET)..."
	$(CC) $(CFLAGS) -o $(TARGET) $(OBJECTS) $(LIBS)
	@echo "✅ Build completed: $(TARGET)"

%.o: %.c parsec_workload.h
	@echo "🔨 Compiling $<..."
	$(CC) $(CFLAGS) -c $< -o $@

clean:
	@echo "🧹 Cleaning build artifacts..."
	rm -f $(OBJECTS) $(TARGET)
	@echo "✅ Clean completed"

install: $(TARGET)
	@echo "🔧 Setting executable permissions..."
	chmod +x $(TARGET)
	@echo "✅ Install completed"

test: $(TARGET)
	@echo "🧪 Testing executable..."
	@if [ -f $(TARGET) ]; then \
		echo "✅ Executable exists"; \
		ls -la $(TARGET); \
	else \
		echo "❌ Executable not found"; \
		exit 1; \
	fi

debug:
	@echo "🔍 Debug information:"
	@echo "CC: $(CC)"
	@echo "CFLAGS: $(CFLAGS)"
	@echo "TARGET: $(TARGET)"
	@echo "SOURCES: $(SOURCES)"
	@echo "OBJECTS: $(OBJECTS)"
	@echo "LIBS: $(LIBS)"
	@echo "Current directory: $(PWD)"
	@echo "Files in current directory:"
	@ls -la
	