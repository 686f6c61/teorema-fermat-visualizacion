"""
Explicación de la Última Conjetura de Fermat

Este módulo proporciona información educativa sobre la Última Conjetura de Fermat,
su historia, significado matemático y visualizaciones para entender por qué 
la ecuación a^n + b^n = c^n no tiene soluciones enteras cuando n > 2.
"""
import numpy as np
import matplotlib.pyplot as plt
from mpl_toolkits.mplot3d import Axes3D


def show_historical_context():
    """Muestra el contexto histórico de la Conjetura de Fermat."""
    print("""
    === CONTEXTO HISTÓRICO DE LA ÚLTIMA CONJETURA DE FERMAT ===
    
    Pierre de Fermat (1607-1665) fue un abogado y matemático francés que realizó
    importantes contribuciones en teoría de números, cálculo infinitesimal, 
    probabilidad y óptica geométrica.
    
    En 1637, mientras estudiaba el libro "Aritmética" de Diofanto, Fermat escribió
    en el margen:
    
    "Es imposible separar un cubo en dos cubos, o una cuarta potencia en dos cuartas
    potencias, o en general, cualquier potencia superior a la segunda en dos potencias
    del mismo grado. He descubierto una demostración verdaderamente maravillosa
    de esta proposición, pero este margen es demasiado estrecho para contenerla."
    
    Esta afirmación, conocida como la Última Conjetura de Fermat, establece que la
    ecuación a^n + b^n = c^n no tiene soluciones enteras positivas cuando n > 2.
    
    Durante más de 350 años, esta conjetura desafió a los mejores matemáticos del mundo.
    Finalmente, en 1995, Andrew Wiles logró demostrarla utilizando matemáticas avanzadas
    del siglo XX, incluyendo curvas elípticas, formas modulares y representaciones
    de Galois.
    
    La demostración de Wiles es extremadamente compleja y requiere herramientas
    matemáticas que no existían en la época de Fermat, lo que sugiere que la "demostración
    maravillosa" que Fermat afirmó tener probablemente era incorrecta.
    """)


def explain_n_equals_2_case():
    """Explica el caso n=2 (Teorema de Pitágoras)."""
    print("""
    === CASO n=2: TEOREMA DE PITÁGORAS ===
    
    Para n=2, la ecuación de Fermat a^2 + b^2 = c^2 representa el Teorema de Pitágoras,
    que relaciona los lados de un triángulo rectángulo.
    
    Existen infinitas soluciones enteras positivas conocidas como "ternas pitagóricas":
        
    - (3, 4, 5)         →  3² + 4² = 9 + 16 = 25 = 5²
    - (5, 12, 13)       →  5² + 12² = 25 + 144 = 169 = 13²
    - (8, 15, 17)       →  8² + 15² = 64 + 225 = 289 = 17²
    - (7, 24, 25)       →  7² + 24² = 49 + 576 = 625 = 25²
    - Y muchas más...
    
    Estas soluciones tienen interpretaciones geométricas claras: representan las
    longitudes de los lados de triángulos rectángulos con medidas enteras.
    
    Se pueden generar todas las ternas pitagóricas primitivas (sin factores comunes)
    con la fórmula de Euclides:
        
    a = m² - n²
    b = 2mn
    c = m² + n²
    
    Donde m, n son enteros positivos con m > n, m y n coprimos, y no ambos impares.
    """)
    
    # Visualizamos algunas ternas pitagóricas
    fig, ax = plt.subplots(figsize=(10, 8))
    
    # Ternas pitagóricas conocidas
    pythagorean_triples = [
        (3, 4, 5), (5, 12, 13), (8, 15, 17), (7, 24, 25),
        (20, 21, 29), (12, 35, 37), (9, 40, 41), (28, 45, 53)
    ]
    
    # Graficamos los puntos
    for a, b, c in pythagorean_triples:
        ax.scatter(a, b, s=100, color='blue', edgecolor='black', alpha=0.7)
        ax.annotate(f'({a},{b},{c})', (a, b), xytext=(5, 5), textcoords='offset points')
    
    # Dibujamos algunas curvas a^2 + b^2 = c^2 para valores constantes de c
    c_values = [5, 13, 17, 25, 37, 41, 53]
    x = np.linspace(1, 50, 1000)
    
    for c in c_values:
        y = np.sqrt(c**2 - x**2)
        mask = ~np.isnan(y) & (y > 0) & (x > 0)
        ax.plot(x[mask], y[mask], '--', color='gray', alpha=0.5, label=f'c={c}' if c == 5 else "")
    
    # Configuración del gráfico
    ax.set_xlim(0, 50)
    ax.set_ylim(0, 50)
    ax.set_xlabel('a', fontsize=14)
    ax.set_ylabel('b', fontsize=14)
    ax.set_title('Ternas Pitagóricas: Soluciones enteras de a² + b² = c²', fontsize=16)
    ax.grid(True, linestyle='--', alpha=0.7)
    
    # Añadimos una explicación
    explanation = (
        "Este gráfico muestra varias ternas pitagóricas, que son soluciones\n"
        "enteras de la ecuación a² + b² = c². Las líneas punteadas representan\n"
        "los puntos (a,b) que satisfacen la ecuación para valores constantes de c.\n"
        "Las soluciones enteras son los puntos marcados en azul."
    )
    plt.figtext(0.1, 0.01, explanation, wrap=True, fontsize=12)
    
    plt.tight_layout()
    plt.show()


def explain_n_greater_than_2():
    """Explica por qué no hay soluciones para n > 2."""
    print("""
    === CASO n > 2: LA ÚLTIMA CONJETURA DE FERMAT ===
    
    Para n > 2, la ecuación a^n + b^n = c^n no tiene soluciones en enteros positivos.
    
    Para entender intuitivamente por qué:
    
    1. Cuando n crece, las potencias a^n y b^n crecen más lentamente que c^n:
       - Si a < c y b < c, entonces a^n + b^n crece más lentamente que c^n
       - Esto significa que a^n + b^n eventualmente será menor que c^n
    
    2. Si intentamos hacer a^n + b^n = c^n, tendríamos que:
       - Si c = a + 1 → a^n + b^n = (a+1)^n
       - Cuando n > 2, el binomio (a+1)^n se expande y tiene términos adicionales
       - Esto hace que (a+1)^n sea significativamente mayor que a^n + b^n
    
    3. Si probamos con valores cercanos:
       - Cuando n > 2, la ecuación a^n + b^n = c^n siempre tiene un "hueco"
       - c^n suele ser mayor que a^n + b^n, o menor, pero nunca exactamente igual
    
    Esto es solo una explicación intuitiva. La demostración formal requiere
    matemáticas avanzadas que van más allá del alcance de esta explicación.
    """)
    
    # Visualizamos por qué la ecuación no tiene soluciones para n=3
    fig, ax = plt.subplots(figsize=(10, 8))
    
    # Definimos algunos puntos para probar
    test_points = [
        (3, 4, 5), (3, 5, 6), (4, 5, 6), (1, 6, 6),
        (6, 8, 10), (2, 8, 8), (4, 8, 9), (9, 10, 13)
    ]
    
    # Evaluamos la diferencia para n=3
    n = 3
    results = []
    
    for a, b, c in test_points:
        left_side = a**n + b**n
        right_side = c**n
        diff = left_side - right_side
        rel_error = abs(diff) / right_side
        
        results.append({
            'a': a, 'b': b, 'c': c,
            'left': left_side, 'right': right_side,
            'diff': diff, 'rel_error': rel_error
        })
        
        # Imprimimos los resultados
        color = 'red' if diff > 0 else 'blue'
        marker = '^' if diff > 0 else 'v'
        
        ax.scatter(a, b, s=100, color=color, marker=marker, edgecolor='black', alpha=0.7)
        ax.annotate(f'({a},{b},{c})', (a, b), xytext=(5, 5), textcoords='offset points')
    
    # Configuración del gráfico
    ax.set_xlim(0, 15)
    ax.set_ylim(0, 15)
    ax.set_xlabel('a', fontsize=14)
    ax.set_ylabel('b', fontsize=14)
    ax.set_title(f'Por qué no hay soluciones enteras para a³ + b³ = c³', fontsize=16)
    ax.grid(True, linestyle='--', alpha=0.7)
    
    # Añadimos marcadores para la leyenda
    ax.scatter([], [], s=100, color='red', marker='^', edgecolor='black', alpha=0.7, label='a³ + b³ > c³')
    ax.scatter([], [], s=100, color='blue', marker='v', edgecolor='black', alpha=0.7, label='a³ + b³ < c³')
    ax.legend(fontsize=12)
    
    # Añadimos una tabla con los resultados
    table_data = [
        ['a', 'b', 'c', 'a³ + b³', 'c³', 'Diferencia', 'Error Rel.']
    ]
    
    for r in results:
        table_data.append([
            f"{r['a']}", f"{r['b']}", f"{r['c']}",
            f"{r['left']}", f"{r['right']}",
            f"{r['diff']:.1f}", f"{r['rel_error']:.4f}"
        ])
    
    table = ax.table(cellText=table_data, loc='bottom', cellLoc='center', colWidths=[0.06] * 7)
    table.auto_set_font_size(False)
    table.set_fontsize(9)
    table.scale(1, 1.5)
    
    # Añadimos una explicación
    explanation = (
        "Este gráfico muestra la imposibilidad de encontrar soluciones enteras para n=3.\n"
        "Los puntos rojos (triángulos hacia arriba) indican a³ + b³ > c³\n"
        "Los puntos azules (triángulos hacia abajo) indican a³ + b³ < c³\n"
        "Para que exista una solución, necesitaríamos a³ + b³ = c³ exactamente,\n"
        "pero observamos que siempre hay un 'salto' entre los dos casos."
    )
    plt.figtext(0.1, 0.01, explanation, wrap=True, fontsize=12)
    
    plt.tight_layout()
    plt.subplots_adjust(bottom=0.35)  # Ajustamos para dar espacio a la tabla
    plt.show()


def visualize_why_no_solution_3d():
    """Visualización 3D para entender por qué no hay soluciones para n > 2."""
    # Creamos la figura 3D
    fig = plt.figure(figsize=(12, 10))
    ax = fig.add_subplot(111, projection='3d')
    
    # Definimos un rango de valores
    values = np.arange(1, 10)
    a, b = np.meshgrid(values, values)
    
    # Calculamos el valor exacto (no entero) de c para n=3
    n = 3
    c_exact = (a**n + b**n)**(1/n)
    
    # Calculamos el entero inferior y superior más cercanos
    c_floor = np.floor(c_exact)
    c_ceil = np.ceil(c_exact)
    
    # Calculamos el error para el entero inferior y superior
    error_floor = abs(a**n + b**n - c_floor**n) / c_floor**n
    error_ceil = abs(a**n + b**n - c_ceil**n) / c_ceil**n
    
    # Usamos el c con menor error
    use_floor = error_floor <= error_ceil
    c = np.where(use_floor, c_floor, c_ceil)
    error = np.where(use_floor, error_floor, error_ceil)
    
    # Convertimos a matrices planas para visualización
    a_flat = a.flatten()
    b_flat = b.flatten()
    c_flat = c.flatten()
    error_flat = error.flatten()
    
    # Establecemos un umbral de error para identificar puntos "casi" soluciones
    threshold = 0.01
    best_indices = np.argsort(error_flat)[:20]  # Los 20 mejores puntos
    
    # Dibujamos la superficie a^3 + b^3 = c^3 (no entera)
    ax.plot_surface(a, b, c_exact, alpha=0.3, color='gray', label='Superficie exacta (no entera)')
    
    # Dibujamos los puntos con menor error
    sc = ax.scatter(a_flat[best_indices], b_flat[best_indices], c_flat[best_indices],
                   c=error_flat[best_indices], cmap='viridis_r', s=100, alpha=0.8,
                   marker='o', edgecolor='black')
    
    # Configuración del gráfico
    ax.set_xlabel('a', fontsize=14)
    ax.set_ylabel('b', fontsize=14)
    ax.set_zlabel('c', fontsize=14)
    ax.set_title(f'Visualización 3D: Por qué no existen soluciones enteras para a³ + b³ = c³', fontsize=16)
    
    # Añadimos una barra de color
    cbar = fig.colorbar(sc, ax=ax, pad=0.1)
    cbar.set_label('Error Relativo', fontsize=12)
    
    # Añadimos una explicación
    explanation = (
        "Esta visualización 3D muestra:\n"
        "- La superficie gris representa los valores exactos (no enteros) de c que satisfacen a³ + b³ = c³\n"
        "- Los puntos coloreados son las mejores aproximaciones enteras\n"
        "- El color indica qué tan cerca están de ser soluciones exactas (más brillante = menor error)\n"
        "- Observe que ningún punto tiene error cero, lo que ilustra la Conjetura de Fermat"
    )
    plt.figtext(0.1, 0.01, explanation, wrap=True, fontsize=12)
    
    plt.tight_layout()
    plt.show()


def show_complete_explanation():
    """Muestra todas las explicaciones y visualizaciones."""
    show_historical_context()
    explain_n_equals_2_case()
    explain_n_greater_than_2()
    visualize_why_no_solution_3d()
    
    print("""
    === CONCLUSIÓN ===
    
    La Última Conjetura de Fermat ilustra un fenómeno sorprendente en matemáticas:
    
    - Para n=2, la ecuación a² + b² = c² tiene infinitas soluciones enteras positivas
      (las ternas pitagóricas).
    
    - Para n>2, la ecuación a^n + b^n = c^n no tiene soluciones enteras positivas,
      aunque podemos encontrar valores que se aproximan.
    
    Este contraste muestra cómo un pequeño cambio en el exponente transforma
    completamente la naturaleza del problema, pasando de tener infinitas soluciones
    a no tener ninguna.
    
    La demostración completa de Andrew Wiles en 1995 resolvió uno de los problemas
    más desafiantes en la historia de las matemáticas, y utiliza herramientas avanzadas
    como curvas elípticas y formas modulares, mostrando la profunda conexión entre
    diferentes áreas de las matemáticas.
    """)


if __name__ == "__main__":
    show_complete_explanation() 