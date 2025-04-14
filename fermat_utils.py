"""
Funciones auxiliares para la visualización de la Última Conjetura de Fermat.

Este módulo contiene funciones para calcular valores relacionados con la ecuación
a^n + b^n = c^n y encontrar puntos que se aproximan a satisfacer la conjetura.
"""
import numpy as np
import pandas as pd
from itertools import product


def fermat_difference(a, b, c, n):
    """
    Calcula la diferencia en la ecuación de Fermat: |a^n + b^n - c^n|
    
    Esta función mide qué tan cerca está una tripla (a,b,c) de satisfacer la ecuación.
    Un valor de 0 indicaría una solución exacta.
    
    Args:
        a, b, c (int): Valores enteros positivos
        n (int): Exponente en la ecuación de Fermat
    
    Returns:
        float: Valor absoluto de la diferencia
    """
    return abs(a**n + b**n - c**n)


def fermat_relative_error(a, b, c, n):
    """
    Calcula el error relativo: |a^n + b^n - c^n| / c^n
    
    Esta función normaliza la diferencia, proporcionando una medida relativa
    de qué tan cercana está una tripla a ser solución.
    
    Args:
        a, b, c (int): Valores enteros positivos
        n (int): Exponente en la ecuación de Fermat
    
    Returns:
        float: Error relativo (valor entre 0 y 1 para aproximaciones cercanas)
    """
    return abs(a**n + b**n - c**n) / c**n


def generate_test_cases(max_value, n_values):
    """
    Genera casos de prueba para diferentes valores de n.
    
    Args:
        max_value (int): Valor máximo para a, b, c
        n_values (list): Lista de exponentes a probar
    
    Returns:
        dict: Diccionario con resultados para cada valor de n
    """
    results = {}
    
    for n in n_values:
        print(f"Generando casos para n = {n}...")
        data = []
        
        # Para valores pequeños, podemos probar de forma exhaustiva
        limit = min(max_value, 30)  # Limitamos para evitar cálculos excesivos
        
        # Generamos todas las combinaciones de a, b dentro del límite
        for a, b in product(range(1, limit + 1), range(1, limit + 1)):
            # Para cada par (a,b), calculamos el valor de c que estaría cerca 
            # de satisfacer la ecuación
            c_float = (a**n + b**n)**(1/n)
            c_low = int(c_float)
            c_high = c_low + 1
            
            # Calculamos el error para los dos valores enteros más cercanos de c
            error_low = fermat_difference(a, b, c_low, n)
            error_high = fermat_difference(a, b, c_high, n)
            
            # Nos quedamos con el que tenga menor error
            if error_low <= error_high and c_low > 0:
                c = c_low
                error = error_low
                rel_error = fermat_relative_error(a, b, c, n)
            elif c_high > 0:
                c = c_high
                error = error_high
                rel_error = fermat_relative_error(a, b, c, n)
            else:
                continue
            
            # Solo guardamos casos con error pequeño para n>2
            if n > 2 and rel_error > 0.1:
                continue
                
            data.append({
                'a': a,
                'b': b,
                'c': c,
                'error': error,
                'relative_error': rel_error,
                'n': n
            })
        
        # Para n=2, encontramos las soluciones exactas (ternas pitagóricas)
        if n == 2:
            # Buscamos más soluciones para n=2 (ternas pitagóricas)
            for a in range(1, max_value + 1):
                for b in range(a, max_value + 1):  # Optimizamos: b >= a
                    c_squared = a**2 + b**2
                    c = int(np.sqrt(c_squared))
                    if c**2 == c_squared and c <= max_value:
                        data.append({
                            'a': a,
                            'b': b,
                            'c': c,
                            'error': 0.0,
                            'relative_error': 0.0,
                            'n': n
                        })
        
        # Convertimos a DataFrame para facilitar su manipulación
        results[n] = pd.DataFrame(data)
        print(f"  Encontrados {len(data)} casos para n = {n}")
    
    return results


def find_near_solutions(max_value, n, error_threshold=0.1):
    """
    Busca valores que están cerca de satisfacer la ecuación de Fermat.
    
    Args:
        max_value (int): Valor máximo para a, b, c
        n (int): Exponente en la ecuación de Fermat
        error_threshold (float): Umbral de error relativo máximo
    
    Returns:
        list: Lista de diccionarios con los valores cerca de ser soluciones
    """
    near_solutions = []
    
    for a in range(1, max_value + 1):
        for b in range(1, max_value + 1):
            # Estimamos un valor aproximado de c
            c_approx = (a**n + b**n)**(1/n)
            
            # Probamos los dos enteros más cercanos
            c_candidates = [int(c_approx), int(c_approx) + 1]
            
            for c in c_candidates:
                if c <= 0 or c > max_value:
                    continue
                    
                error = fermat_difference(a, b, c, n)
                rel_error = fermat_relative_error(a, b, c, n)
                
                if rel_error <= error_threshold:
                    near_solutions.append({
                        'a': a, 
                        'b': b, 
                        'c': c,
                        'error': error,
                        'relative_error': rel_error
                    })
    
    return near_solutions 