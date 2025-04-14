"""
Visualización de la Última Conjetura de Fermat

Este script genera visualizaciones en 3D para ilustrar la Última Conjetura de Fermat,
que establece que no existen enteros positivos a, b, c que satisfagan la ecuación
a^n + b^n = c^n para n > 2.

La visualización muestra:
1. Para n=2: múltiples soluciones exactas (ternas pitagóricas)
2. Para n>2: ausencia de soluciones exactas, pero existencia de puntos cercanos
"""
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
from matplotlib.cm import ScalarMappable
from mpl_toolkits.mplot3d import Axes3D
import plotly.express as px
import plotly.graph_objects as go
from fermat_utils import generate_test_cases, find_near_solutions

# Configuración de estilo para gráficos más atractivos
plt.style.use('seaborn-v0_8-whitegrid')


def plot_3d_scatter_matplotlib(results_dict, title="Visualización de la Conjetura de Fermat"):
    """
    Crea una visualización 3D utilizando Matplotlib.
    
    Args:
        results_dict (dict): Diccionario con DataFrames para cada valor de n
    """
    fig = plt.figure(figsize=(12, 10))
    ax = fig.add_subplot(111, projection='3d')
    
    # Colores diferentes para cada valor de n
    colors = ['blue', 'red', 'green', 'purple', 'orange']
    markers = ['o', '^', 's', 'D', 'x']
    
    # Para guardar los datos de la leyenda
    legend_elements = []
    
    for i, (n, df) in enumerate(results_dict.items()):
        color = colors[i % len(colors)]
        marker = markers[i % len(markers)]
        
        # Para n=2, destacamos las soluciones exactas
        if n == 2:
            # Filtramos soluciones exactas (error = 0)
            exact = df[df['error'] == 0]
            if len(exact) > 0:
                ax.scatter(exact['a'], exact['b'], exact['c'], 
                          c='gold', marker='*', s=100, label=f'n={n} (soluciones exactas)')
            
            # Filtramos aproximaciones (error > 0)
            approx = df[df['error'] > 0]
            if len(approx) > 0:
                # Calculamos tamaños para cada punto, asegurándonos de que tenga la misma longitud
                approx_sizes = 50 * (1 - np.minimum(approx['relative_error'], 0.5) / 0.5)
                ax.scatter(approx['a'], approx['b'], approx['c'], 
                          c=color, marker=marker, s=approx_sizes, alpha=0.6, label=f'n={n} (aproximaciones)')
        else:
            # Calculamos tamaños para cada punto, asegurándonos de que tenga la misma longitud
            df_sizes = 50 * (1 - np.minimum(df['relative_error'], 0.5) / 0.5)
            ax.scatter(df['a'], df['b'], df['c'], 
                      c=color, marker=marker, s=df_sizes, alpha=0.6, label=f'n={n}')
    
    # Configuración del gráfico
    ax.set_xlabel('a', fontsize=14)
    ax.set_ylabel('b', fontsize=14)
    ax.set_zlabel('c', fontsize=14)
    ax.set_title(title, fontsize=16)
    
    # Añadimos leyenda
    ax.legend(loc='upper left', fontsize=12)
    
    # Añadimos una nota explicativa
    explanation = (
        "Visualización 3D de la Conjetura de Fermat:\n"
        "- Para n=2 (teorema de Pitágoras): existen múltiples soluciones exactas\n"
        "- Para n>2: no hay soluciones exactas en enteros positivos\n"
        "El tamaño de los puntos indica qué tan cerca están de ser solución"
    )
    plt.figtext(0.1, 0.01, explanation, wrap=True, fontsize=12)
    
    plt.tight_layout()
    plt.savefig('fermat_3d_visualization.png', dpi=300, bbox_inches='tight')
    plt.show()


def plot_3d_interactive_plotly(results_dict, title="Visualización Interactiva de la Conjetura de Fermat"):
    """
    Crea una visualización 3D interactiva utilizando Plotly.
    
    Args:
        results_dict (dict): Diccionario con DataFrames para cada valor de n
    """
    # Combinamos todos los datos en un solo DataFrame
    combined_data = pd.concat([df.assign(n_value=n) for n, df in results_dict.items()])
    
    # Convertimos el error relativo a una escala de colores más intuitiva
    combined_data['error_for_color'] = 1 - np.minimum(combined_data['relative_error'], 0.5) / 0.5
    
    # Creamos una columna para identificar soluciones exactas
    combined_data['solution_type'] = 'Aproximación'
    combined_data.loc[combined_data['error'] == 0, 'solution_type'] = 'Solución Exacta'
    
    # Creamos el gráfico interactivo
    fig = px.scatter_3d(
        combined_data,
        x='a', y='b', z='c',
        color='error_for_color',
        color_continuous_scale=px.colors.sequential.Viridis,
        opacity=0.8,
        size='error_for_color',  # Tamaño inversamente proporcional al error
        size_max=15,
        symbol='n_value',
        hover_name='n_value',
        hover_data={
            'a': True,
            'b': True,
            'c': True,
            'error': ':.10f',
            'relative_error': ':.10f',
            'n_value': True,
            'error_for_color': False,
            'solution_type': True
        },
        labels={
            'a': 'Valor de a',
            'b': 'Valor de b',
            'c': 'Valor de c',
            'error': 'Error Absoluto',
            'relative_error': 'Error Relativo',
            'n_value': 'Exponente n',
            'error_for_color': 'Precisión'
        },
        title=title
    )
    
    # Mejoramos la apariencia
    fig.update_layout(
        scene=dict(
            xaxis_title='a',
            yaxis_title='b',
            zaxis_title='c',
        ),
        coloraxis_colorbar=dict(
            title='Precisión',
            tickvals=[0, 0.5, 1],
            ticktext=['Baja', 'Media', 'Alta']
        ),
        legend_title_text='Exponente n',
        width=900,
        height=700,
    )
    
    # Añadimos anotaciones explicativas
    fig.add_annotation(
        text="• Para n=2 (teorema de Pitágoras): existen múltiples soluciones exactas<br>• Para n>2: no hay soluciones exactas en enteros positivos",
        xref="paper", yref="paper",
        x=0, y=-0.1,
        showarrow=False,
        font=dict(size=14)
    )
    
    # Guardamos como HTML interactivo y mostramos
    fig.write_html('fermat_interactive_visualization.html')
    fig.show()


def plot_error_comparison(results_dict):
    """
    Crea un gráfico que compara los errores relativos para diferentes valores de n.
    
    Args:
        results_dict (dict): Diccionario con DataFrames para cada valor de n
    """
    fig, ax = plt.subplots(figsize=(12, 8))
    
    colors = ['blue', 'red', 'green', 'purple', 'orange']
    
    for i, (n, df) in enumerate(results_dict.items()):
        # Ordenamos los datos por error relativo
        sorted_df = df.sort_values('relative_error')
        
        # Limitamos a los 100 mejores casos para cada n
        plot_df = sorted_df.head(100)
        
        # Creamos un índice normalizado para comparación
        indices = np.linspace(0, 1, len(plot_df))
        
        ax.plot(indices, plot_df['relative_error'], 
                label=f'n={n}', color=colors[i % len(colors)], linewidth=2)
        
        # Marcamos las soluciones exactas (si existen)
        exact_solutions = plot_df[plot_df['error'] == 0]
        if len(exact_solutions) > 0:
            # Convertimos los índices correctamente para el scatter
            exact_indices = [indices[j] for j, idx in enumerate(plot_df.index) if idx in exact_solutions.index]
            ax.scatter(
                exact_indices,
                exact_solutions['relative_error'],
                s=100, color='gold', edgecolor='black', zorder=5,
                label=f'n={n} (soluciones exactas)' if i == 0 else ""
            )
    
    # Configuración del gráfico
    ax.set_yscale('log')  # Escala logarítmica para ver mejor las diferencias
    ax.set_xlabel('Índice normalizado (mejores aproximaciones)', fontsize=14)
    ax.set_ylabel('Error relativo (escala log)', fontsize=14)
    ax.set_title('Comparación de errores relativos para diferentes valores de n', fontsize=16)
    ax.grid(True, which='both', linestyle='--', alpha=0.7)
    ax.legend(fontsize=12)
    
    # Añadimos explicación
    explanation = (
        "Este gráfico muestra el error relativo para las mejores aproximaciones:\n"
        "- Para n=2: existen soluciones exactas (error = 0)\n"
        "- Para n>2: incluso las mejores aproximaciones tienen un error > 0\n"
        "La escala logarítmica permite visualizar mejor las diferencias."
    )
    plt.figtext(0.1, 0.01, explanation, wrap=True, fontsize=12)
    
    plt.tight_layout()
    plt.savefig('fermat_error_comparison.png', dpi=300, bbox_inches='tight')
    plt.show()


def main():
    """Función principal que ejecuta todas las visualizaciones."""
    # Definimos los parámetros
    max_value = 50
    n_values = [2, 3, 4, 5]
    
    print("=== Visualización de la Última Conjetura de Fermat ===")
    print(f"Buscando combinaciones para valores de n: {n_values}")
    print(f"Rango de valores para a, b, c: 1 a {max_value}")
    
    # Generamos los datos
    results = generate_test_cases(max_value, n_values)
    
    # Contamos cuántas soluciones exactas hay para cada n
    for n, df in results.items():
        exact_count = len(df[df['error'] == 0])
        print(f"Soluciones exactas encontradas para n={n}: {exact_count}")
    
    # Visualizaciones
    print("\nGenerando visualización 3D con Matplotlib...")
    try:
        plot_3d_scatter_matplotlib(results)
    except Exception as e:
        print(f"\nError en la visualización 3D con Matplotlib: {e}")
        print("Continuando con las demás visualizaciones...")
    
    print("\nGenerando visualización interactiva con Plotly...")
    try:
        plot_3d_interactive_plotly(results)
    except Exception as e:
        print(f"\nError en la visualización interactiva con Plotly: {e}")
    
    print("\nGenerando comparación de errores...")
    try:
        plot_error_comparison(results)
    except Exception as e:
        print(f"\nError en la comparación de errores: {e}")
    
    print("\n=== Visualización completada ===")
    print("Se han guardado los siguientes archivos:")
    print("- fermat_3d_visualization.png")
    print("- fermat_interactive_visualization.html")
    print("- fermat_error_comparison.png")


if __name__ == "__main__":
    main() 