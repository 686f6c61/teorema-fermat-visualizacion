#!/usr/bin/env python3
"""
Script principal para ejecutar el proyecto de visualización de la Última Conjetura de Fermat.

Este script permite al usuario elegir entre diferentes componentes del proyecto:
1. Visualización 3D de aproximaciones a la conjetura
2. Explicación educativa sobre la conjetura y su historia
3. Ejecutar todos los componentes
"""
import sys
import time

def print_header():
    """Imprime un encabezado atractivo para el proyecto."""
    print("\n" + "="*80)
    print(" "*20 + "VISUALIZACIÓN DE LA ÚLTIMA CONJETURA DE FERMAT")
    print("="*80)
    print("""
    La Última Conjetura de Fermat establece que la ecuación:
        
        a^n + b^n = c^n
        
    No tiene soluciones en enteros positivos cuando n > 2.
    
    Este proyecto ofrece visualizaciones y explicaciones educativas
    para entender por qué esta conjetura es verdadera.
    """)
    print("="*80 + "\n")


def print_menu():
    """Imprime el menú de opciones disponibles."""
    print("\nOpciones disponibles:")
    print("  1. Generar visualizaciones en 3D de la conjetura")
    print("  2. Ver explicación educativa sobre la conjetura")
    print("  3. Ejecutar todos los componentes")
    print("  0. Salir")
    return input("\nSeleccione una opción (0-3): ")


def run_visualization():
    """Ejecuta el módulo de visualización 3D."""
    print("\nEjecutando visualizaciones 3D...")
    try:
        from fermat_visualization import main as run_visualizations
        run_visualizations()
    except ImportError as e:
        print(f"Error: No se pudo importar el módulo de visualización. {e}")
        print("Asegúrese de que el archivo fermat_visualization.py existe y que ha instalado todas las dependencias.")
        print("Puede instalar las dependencias con: pip install -r requirements.txt")


def run_explanation():
    """Ejecuta el módulo de explicación educativa."""
    print("\nEjecutando explicación educativa...")
    try:
        from fermat_explanation import show_complete_explanation
        show_complete_explanation()
    except ImportError as e:
        print(f"Error: No se pudo importar el módulo de explicación. {e}")
        print("Asegúrese de que el archivo fermat_explanation.py existe y que ha instalado todas las dependencias.")
        print("Puede instalar las dependencias con: pip install -r requirements.txt")


def run_all():
    """Ejecuta todos los componentes del proyecto."""
    print("\nEjecutando todos los componentes del proyecto...\n")
    time.sleep(1)
    
    # Primero la explicación educativa
    run_explanation()
    
    print("\nPasando a las visualizaciones 3D...")
    time.sleep(2)
    
    # Luego las visualizaciones
    run_visualization()


def check_dependencies():
    """Verifica que todas las dependencias necesarias estén instaladas."""
    required_packages = ['numpy', 'matplotlib', 'plotly', 'pandas']
    missing_packages = []
    
    for package in required_packages:
        try:
            __import__(package)
        except ImportError:
            missing_packages.append(package)
    
    if missing_packages:
        print("ADVERTENCIA: Faltan las siguientes dependencias:")
        for package in missing_packages:
            print(f"  - {package}")
        print("\nPuede instalarlas con el siguiente comando:")
        print("  pip install -r requirements.txt")
        
        if input("\n¿Desea continuar de todas formas? (s/n): ").lower() != 's':
            print("Saliendo del programa...")
            sys.exit(1)
    else:
        print("Todas las dependencias están instaladas correctamente.")


def main():
    """Función principal que maneja la ejecución del programa."""
    print_header()
    
    # Verificamos dependencias
    check_dependencies()
    
    while True:
        option = print_menu()
        
        if option == '0':
            print("\nSaliendo del programa...")
            break
        elif option == '1':
            run_visualization()
        elif option == '2':
            run_explanation()
        elif option == '3':
            run_all()
        else:
            print("\nOpción no válida. Por favor, seleccione una opción del 0 al 3.")
        
        input("\nPresione Enter para continuar...")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\nPrograma interrumpido por el usuario.")
        sys.exit(0)
    except Exception as e:
        print(f"\nError inesperado: {e}")
        sys.exit(1) 