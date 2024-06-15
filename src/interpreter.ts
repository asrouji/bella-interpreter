type BuiltInFunction = (...args: Value[]) => Value
type UserFunction = [Identifier[], Expression]
export type Value = number | boolean | Value[] | BuiltInFunction | UserFunction

type Memory = Map<string, Value>
type Output = Value[]
type State = [Memory, Output]

// Custom type guards

const isUserFunction = (v: Value): v is UserFunction => {
  return Array.isArray(v) && Array.isArray(v[0]) && v[0].length === 2
}

const isBuiltInFunction = (v: Value): v is BuiltInFunction => {
  return typeof v === 'function'
}

const isArray = (x: Value): x is Value[] => {
  return Array.isArray(x)
}

// Expressions

export interface Expression {
  interpret(m: Memory): Value
}

export class Numeral implements Expression {
  constructor(public value: number) {}
  interpret(_: Memory): Value {
    return this.value
  }
}

export class BooleanLiteral implements Expression {
  constructor(public value: boolean) {}
  interpret(_: Memory): Value {
    return this.value
  }
}

export class Identifier implements Expression {
  constructor(public name: string) {}
  interpret(m: Memory): Value {
    const value = m.get(this.name)
    if (value === undefined) {
      throw new Error(`Identifier ${this.name} has not been declared`)
    }
    return value
  }
}

export class UnaryExpression implements Expression {
  constructor(public operator: string, public expression: Expression) {}
  interpret(m: Memory): Value {
    const value = this.expression.interpret(m)
    if (this.operator === '-') {
      if (typeof value !== 'number') {
        throw new Error('Expected number to negate')
      }
      return -value
    } else if (this.operator === '!') {
      if (typeof value !== 'boolean') {
        throw new Error('Expected boolean to negate')
      }
      return !value
    } else {
      throw new Error(`Unknown operator ${this.operator} for unary expression`)
    }
  }
}

export class BinaryExpression implements Expression {
  static numericOperators = ['+', '-', '*', '/', '%', '**', '>', '<', '>=', '<=', '==', '!=']
  static booleanOperators = ['&&', '||']

  constructor(public operator: string, public left: Expression, public right: Expression) {}
  interpret(m: Memory): Value {
    const leftValue = this.left.interpret(m)
    const rightValue = this.right.interpret(m)

    if (BinaryExpression.numericOperators.includes(this.operator)) {
      if (typeof leftValue !== 'number' || typeof rightValue !== 'number') {
        throw new Error(`Expected numerical arguments for operator ${this.operator}`)
      }
      switch (this.operator) {
        case '+':
          return leftValue + rightValue
        case '-':
          return leftValue - rightValue
        case '*':
          return leftValue * rightValue
        case '/':
          if (rightValue === 0) {
            throw new Error('Division by zero')
          }
          return leftValue / rightValue
        case '%':
          return leftValue % rightValue
        case '**':
          return leftValue ** rightValue
        case '>':
          return leftValue > rightValue
        case '>=':
          return leftValue >= rightValue
        case '<':
          return leftValue < rightValue
        case '<=':
          return leftValue <= rightValue
        case '==':
          return leftValue === rightValue
        case '!=':
          return leftValue !== rightValue
      }
    } else if (BinaryExpression.booleanOperators.includes(this.operator)) {
      if (typeof leftValue !== 'boolean' || typeof rightValue !== 'boolean') {
        throw new Error(`Expected boolean arguments for operator ${this.operator}`)
      }
      switch (this.operator) {
        case '&&':
          return leftValue && rightValue
        case '||':
          return leftValue || rightValue
      }
    }

    throw new Error(`Unknown operator ${this.operator} for binary expression`)
  }
}

export class Call implements Expression {
  constructor(public callee: Identifier, public args: Expression[]) {}
  interpret(m: Memory): Value {
    const functionValue = m.get(this.callee.name)
    const argValues = this.args.map(arg => arg.interpret(m))
    if (functionValue === undefined) {
      throw new Error('Identifier was undeclared')
    } else if (isUserFunction(functionValue)) {
      const [parameters, expression] = functionValue
      if (parameters.length !== this.args.length) {
        throw new Error('Wrong number of arguments')
      }
      const locals = parameters.map((p, i) => [p.name, argValues[i]] as const)
      return expression.interpret(new Map([...m, ...locals]))
    } else if (isBuiltInFunction(functionValue)) {
      return functionValue(...argValues)
    } else {
      throw new Error('Not a function')
    }
  }
}

export class ConditionalExpression implements Expression {
  constructor(public test: Expression, public consequent: Expression, public alternate: Expression) {}
  interpret(m: Memory): Value {
    const testValue = this.test.interpret(m)
    if (typeof testValue !== 'boolean') {
      throw new Error(`Expected boolean as test in conditional expression, got ${testValue}`)
    }
    return testValue ? this.consequent.interpret(m) : this.alternate.interpret(m)
  }
}

export class ArrayLiteral implements Expression {
  constructor(public elements: Expression[]) {}
  interpret(m: Memory): Value {
    return this.elements.map(e => e.interpret(m))
  }
}

export class SubscriptExpression implements Expression {
  constructor(public array: Expression, public subscript: Expression) {}
  interpret(m: Memory): Value {
    const arrayValue = this.array.interpret(m)
    const subscriptValue = this.subscript.interpret(m)
    if (!isArray(arrayValue)) {
      throw new Error(`Expected array to subscript, got ${arrayValue}`)
    }
    if (typeof subscriptValue !== 'number') {
      throw new Error(`Expected number as subscript, got ${subscriptValue}`)
    }
    if (subscriptValue < 0 || subscriptValue >= arrayValue.length) {
      throw new Error(`Subscript ${subscriptValue} out of bounds for array of length ${arrayValue.length}`)
    }
    return arrayValue[subscriptValue]
  }
}

// Statements

export interface Statement {
  interpret([m, o]: State): State
}

export class VariableDeclaration implements Statement {
  constructor(public id: Identifier, public expression: Expression) {}
  interpret([m, o]: State): State {
    if (m.has(this.id.name)) {
      throw new Error(`Identifier ${this.id.name} has already been declared`)
    }
    const value = this.expression.interpret(m)
    return [new Map([...m, [this.id.name, value]]), o]
  }
}

export class FunctionDeclaration implements Statement {
  constructor(public id: Identifier, public parameters: Identifier[], public expression: Expression) {}
  interpret([m, o]: State): State {
    if (m.has(this.id.name)) {
      throw new Error(`Identifier ${this.id.name} has already been declared`)
    }
    const repeatedParameter = this.parameters.find((p, i) => this.parameters.map(id => id.name).indexOf(p.name) !== i)
    if (repeatedParameter) {
      throw new Error(`Parameter ${repeatedParameter.name} repeated in function declaration ${this.id.name}`)
    }
    return [new Map([...m, [this.id.name, [this.parameters, this.expression]]]), o]
  }
}

export class Assignment implements Statement {
  constructor(public id: Identifier, public expression: Expression) {}
  interpret([m, o]: State): State {
    const memoryValue = m.get(this.id.name)

    if (memoryValue === undefined) {
      throw new Error(`Identifier ${this.id.name} has not been declared`)
    } else if (isUserFunction(memoryValue) || isBuiltInFunction(memoryValue)) {
      throw new Error('Cannot assign to function')
    } else if (this.id.name === 'pi') {
      throw new Error('Cannot assign to built-in constant')
    }

    const value = this.expression.interpret(m)
    return [new Map([...m, [this.id.name, value]]), o]
  }
}

export class PrintStatement implements Statement {
  constructor(public expression: Expression) {}
  interpret([m, o]: State): State {
    return [m, [...o, this.expression.interpret(m)]]
  }
}

export class WhileStatement implements Statement {
  constructor(public expression: Expression, public block: Block) {}
  interpret([m, o]: State): State {
    let state: State = [m, o]
    // explicitly checking against true to avoid type coercion
    while (this.expression.interpret(state[0]) === true) {
      state = this.block.interpret(state)
    }
    return state
  }
}

// Block

export class Block {
  constructor(public statements: Statement[]) {}
  interpret([m, o]: State): State {
    let state: State = [m, o]
    for (let statement of this.statements) {
      state = statement.interpret(state)
    }
    return state
  }
}

// Program

export class Program {
  constructor(public block: Block) {}
  interpret(): Output {
    const initialMemory: Memory = new Map<string, Value>([
      ['pi', Math.PI as Value],
      ['sqrt', Math.sqrt as Value],
      ['sin', Math.sin as Value],
      ['cos', Math.cos as Value],
      ['ln', Math.log as Value],
      ['exp', Math.exp as Value],
      ['hypot', Math.hypot as Value],
    ])
    const [_, o] = this.block.interpret([initialMemory, []])
    return o
  }
}

export function interpret(p: Program) {
  return p.interpret()
}
