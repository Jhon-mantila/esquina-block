import assert from 'node:assert/strict';
import { test } from 'node:test';
import { allowedTiers, classifyDevice } from './capabilities.js';

test('8 GB y 8 núcleos quedan en alta: Chrome topea la memoria en 8', () => {
    assert.equal(classifyDevice({ ramGb: 8, cores: 8 }), 'high');
});

test('4 GB y 4 núcleos quedan en equilibrado', () => {
    assert.equal(classifyDevice({ ramGb: 4, cores: 4 }), 'balanced');
});

test('muchos núcleos con poca memoria siguen en básico', () => {
    assert.equal(classifyDevice({ ramGb: 2, cores: 16 }), 'basic');
});

test('sin dato de memoria, 8 núcleos quedan en equilibrado y 12 en alta', () => {
    assert.equal(classifyDevice({ ramGb: null, cores: 8 }), 'balanced');
    assert.equal(classifyDevice({ ramGb: null, cores: 12 }), 'high');
});

test('sin dato de memoria y pocos núcleos quedan en básico', () => {
    assert.equal(classifyDevice({ ramGb: null, cores: 2 }), 'basic');
});

test('un equipo limitado solo puede usar la calidad básica', () => {
    assert.deepEqual(allowedTiers('basic'), {
        basic: true,
        balanced: false,
        high: false,
    });
});

test('un equipo intermedio puede elegir alta calidad', () => {
    assert.deepEqual(allowedTiers('balanced'), {
        basic: true,
        balanced: true,
        high: true,
    });
});
