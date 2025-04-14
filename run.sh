#!/bin/bash

# ================================================================================
# Script de inicialización para visualización de la Última Conjetura de Fermat
# 
# Autor: @686f6c61 (https://github.com/686f6c61)
# 
# Este script automatiza la creación del entorno, instalación de dependencias
# y ejecución del proyecto de visualización matemática.
# 
# La configuración automática del entorno elimina la fricción inicial que suele
# desalentar a los usuarios, cumpliendo con mi filosofía de crear herramientas
# accesibles para la visualización y comprensión de conceptos matemáticos complejos.
# ================================================================================

# Colores para mensajes - mejora la UX con feedback visual claro
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # Sin color

echo -e "${GREEN}=== Iniciando el proyecto de visualización de la Última Conjetura de Fermat ===${NC}"

# Implementación de detección inteligente de Python 3 - compatible con diversas configuraciones
# Un problema común en proyectos Python es la inconsistencia entre 'python' y 'python3'
if command -v python3 &>/dev/null; then
    PYTHON="python3"
    echo -e "${GREEN}Detectado Python 3: $($PYTHON --version)${NC}"
elif command -v python &>/dev/null; then
    # Verificación avanzada para determinar si 'python' es realmente Python 3
    PYTHON_VERSION=$(python --version 2>&1)
    if [[ $PYTHON_VERSION == *"Python 3"* ]]; then
        PYTHON="python"
        echo -e "${GREEN}Detectado Python 3 como 'python': $(python --version)${NC}"
    else
        echo -e "${RED}Error: Se requiere Python 3 para ejecutar este proyecto."
        echo -e "Versión detectada: $(python --version)${NC}"
        exit 1
    fi
else
    echo -e "${RED}Error: No se encontró Python. Por favor, instale Python 3.${NC}"
    exit 1
fi

# Aislamiento de dependencias mediante entorno virtual
# Buena práctica de ingeniería: separar las dependencias de proyecto del sistema
VENV_DIR="fermat_venv"

# Verificar si hay un entorno virtual existente y eliminarlo para empezar fresco
if [ -d "$VENV_DIR" ]; then
    echo -e "${YELLOW}Eliminando entorno virtual existente para evitar conflictos...${NC}"
    rm -rf $VENV_DIR
fi

# Crear nuevo entorno virtual
echo -e "${YELLOW}Creando entorno virtual en '$VENV_DIR'...${NC}"
$PYTHON -m venv $VENV_DIR
if [ $? -ne 0 ]; then
    echo -e "${RED}Error: No se pudo crear el entorno virtual."
    echo -e "Intente instalar el módulo venv con: 'pip install virtualenv'${NC}"
    exit 1
fi

# Compatibilidad cross-platform: detecta automáticamente el SO y ajusta rutas
if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
    # Windows
    ACTIVATE_SCRIPT="$VENV_DIR/Scripts/activate"
else
    # Unix/Linux/MacOS
    ACTIVATE_SCRIPT="$VENV_DIR/bin/activate"
fi

# Activación del entorno
echo -e "${YELLOW}Activando entorno virtual...${NC}"
source $ACTIVATE_SCRIPT

# Actualizar pip y herramientas básicas
echo -e "${YELLOW}Actualizando pip y setuptools...${NC}"
pip install --upgrade pip setuptools wheel

# Instalación manual de dependencias principales con --only-binary para evitar compilación
echo -e "${YELLOW}Instalando dependencias (usando binarios precompilados)...${NC}"
pip install numpy --only-binary=:all:
pip install matplotlib --only-binary=:all:
pip install pandas --only-binary=:all:
pip install plotly --only-binary=:all:
pip install ipywidgets --only-binary=:all:

# Verificación pre-ejecución: asegura que el componente principal exista
if [ -f "run_fermat_project.py" ]; then
    echo -e "${GREEN}Ejecutando el proyecto...${NC}"
    python run_fermat_project.py
else
    echo -e "${RED}Error: No se encontró el archivo run_fermat_project.py${NC}"
    exit 1
fi

# Limpieza: restaurar el estado del sistema
deactivate

echo -e "${GREEN}=== Finalizado ===${NC}"
# Fin del script - @686f6c61 - Para más proyectos matemáticos, visita mi GitHub 