import { test, gleich } from './harness.js';
import { leseDezimal, zahlDE } from '../js/zahlen.js';

test('Zahl: Dezimalkomma', () => gleich(leseDezimal('2,40'), 2.4));
test('Zahl: Dezimalpunkt', () => gleich(leseDezimal('2.40'), 2.4));
test('Zahl: ganze Zahl mit Leerzeichen', () => gleich(leseDezimal(' 32 '), 32));
test('Zahl: negativ', () => gleich(leseDezimal('-1,5'), -1.5));
test('Zahl: mehrdeutig 1.234,5 → null', () => gleich(leseDezimal('1.234,5'), null));
test('Zahl: Leerzeichen in der Zahl → null (keine stille Korrektur)', () => gleich(leseDezimal('2 40'), null));
test('Zahl: Text → null', () => gleich(leseDezimal('zwei'), null));
test('Zahl: leer → null', () => gleich(leseDezimal(''), null));
test('Zahl: Ausgabe mit Komma', () => gleich(zahlDE(2.4), '2,4'));
