import {
  ArrayLiteral,
  Assignment,
  BinaryExpression,
  Block,
  BooleanLiteral,
  Call,
  ConditionalExpression,
  FunctionDeclaration,
  Identifier,
  Numeral,
  PrintStatement,
  Program,
  SubscriptExpression,
  UnaryExpression,
  Value,
  VariableDeclaration,
  WhileStatement,
  interpret,
} from './interpreter'
import assert from 'assert/strict'

/**
 * Valid programs that run without error
 * Tests will ensure that the output of the program is as expected
 * [description, program, output]
 */
const validPrograms: [string, Program, Value[]][] = [
  ['numeral print', new Program(new Block([new PrintStatement(new Numeral(5))])), [5]],
  ['boolean print', new Program(new Block([new PrintStatement(new BooleanLiteral(true))])), [true]],
  [
    'unary operators',
    new Program(
      new Block([
        new PrintStatement(new UnaryExpression('-', new Numeral(5))),
        new PrintStatement(new UnaryExpression('!', new BooleanLiteral(true))),
      ])
    ),
    [-5, false],
  ],
  [
    'binary operators',
    new Program(
      new Block([
        new PrintStatement(new BinaryExpression('+', new Numeral(6), new Numeral(3))),
        new PrintStatement(new BinaryExpression('-', new Numeral(6), new Numeral(3))),
        new PrintStatement(new BinaryExpression('*', new Numeral(6), new Numeral(3))),
        new PrintStatement(new BinaryExpression('/', new Numeral(6), new Numeral(3))),
        new PrintStatement(new BinaryExpression('%', new Numeral(6), new Numeral(3))),
        new PrintStatement(new BinaryExpression('**', new Numeral(6), new Numeral(3))),
        new PrintStatement(new BinaryExpression('>', new Numeral(6), new Numeral(3))),
        new PrintStatement(new BinaryExpression('<', new Numeral(6), new Numeral(3))),
        new PrintStatement(new BinaryExpression('>=', new Numeral(6), new Numeral(3))),
        new PrintStatement(new BinaryExpression('<=', new Numeral(6), new Numeral(3))),
        new PrintStatement(new BinaryExpression('==', new Numeral(6), new Numeral(3))),
        new PrintStatement(new BinaryExpression('!=', new Numeral(6), new Numeral(3))),
        new PrintStatement(new BinaryExpression('&&', new BooleanLiteral(true), new BooleanLiteral(false))),
        new PrintStatement(new BinaryExpression('||', new BooleanLiteral(false), new BooleanLiteral(true))),
      ])
    ),
    [9, 3, 18, 2, 0, 216, true, false, true, false, false, true, false, true],
  ],
  [
    'built-in function calls',
    new Program(
      new Block([
        new PrintStatement(new Call(new Identifier('sqrt'), [new Numeral(25)])),
        // sin, cos, ln, exp, hypot
        new PrintStatement(new Call(new Identifier('sin'), [new Numeral(0)])),
        new PrintStatement(new Call(new Identifier('cos'), [new Identifier('pi')])),
        new PrintStatement(new Call(new Identifier('ln'), [new Numeral(1)])),
        new PrintStatement(new Call(new Identifier('exp'), [new Numeral(1)])),
        new PrintStatement(new Call(new Identifier('hypot'), [new Numeral(3), new Numeral(4)])),
      ])
    ),
    [5, 0, -1, 0, Math.E, 5],
  ],
  [
    'user-defined function calls and declarations',
    new Program(
      new Block([
        new FunctionDeclaration(
          new Identifier('add'),
          [new Identifier('x'), new Identifier('y')],
          new BinaryExpression('+', new Identifier('x'), new Identifier('y'))
        ),
        new PrintStatement(new Call(new Identifier('add'), [new Numeral(6), new Numeral(4)])),
      ])
    ),
    [10],
  ],
  [
    'conditional expressions',
    new Program(
      new Block([
        new PrintStatement(new ConditionalExpression(new BooleanLiteral(true), new Numeral(5), new Numeral(3))),
        new PrintStatement(
          new ConditionalExpression(
            new BinaryExpression('==', new Numeral(4), new Numeral(6)),
            new Numeral(5),
            new Numeral(3)
          )
        ),
      ])
    ),
    [5, 3],
  ],
  [
    'array literals',
    new Program(
      new Block([
        new PrintStatement(new ArrayLiteral([new Numeral(1), new Numeral(2), new Numeral(3)])),
        new PrintStatement(new ArrayLiteral([new BooleanLiteral(true), new BooleanLiteral(false)])),
        new PrintStatement(new ArrayLiteral([new UnaryExpression('-', new Numeral(1)), new Numeral(2)])),
      ])
    ),
    [
      [1, 2, 3],
      [true, false],
      [-1, 2],
    ],
  ],
  [
    'subscripting arrays',
    new Program(
      new Block([
        new PrintStatement(
          new SubscriptExpression(new ArrayLiteral([new Numeral(1), new Numeral(2), new Numeral(3)]), new Numeral(0))
        ),
        new PrintStatement(
          new SubscriptExpression(new ArrayLiteral([new Numeral(1), new Numeral(2), new Numeral(3)]), new Numeral(1))
        ),
        new PrintStatement(
          new SubscriptExpression(
            new ArrayLiteral([new Numeral(1), new Numeral(2), new Numeral(3)]),
            new BinaryExpression('+', new Numeral(1), new Numeral(1))
          )
        ),
      ])
    ),
    [1, 2, 3],
  ],
  [
    'variable declaration and assignment',
    new Program(
      new Block([
        new VariableDeclaration(new Identifier('x'), new Numeral(5)),
        new PrintStatement(new Identifier('x')),
        new VariableDeclaration(new Identifier('y'), new BinaryExpression('+', new Identifier('x'), new Numeral(5))),
        new PrintStatement(new Identifier('y')),
        new VariableDeclaration(new Identifier('z'), new BooleanLiteral(true)),
        new PrintStatement(new Identifier('z')),
        new Assignment(new Identifier('x'), new Numeral(10)),
        new PrintStatement(new Identifier('x')),
        new Assignment(new Identifier('y'), new BinaryExpression('-', new Identifier('x'), new Numeral(5))),
        new PrintStatement(new Identifier('y')),
        new Assignment(new Identifier('y'), new BinaryExpression('*', new Identifier('y'), new Numeral(2))),
        new PrintStatement(new Identifier('y')),
      ])
    ),
    [5, 10, true, 10, 5, 10],
  ],
  [
    'while statement',
    new Program(
      new Block([
        new VariableDeclaration(new Identifier('x'), new Numeral(5)),
        new WhileStatement(
          new BinaryExpression('>', new Identifier('x'), new Numeral(0)),
          new Block([
            new PrintStatement(new Identifier('x')),
            new Assignment(new Identifier('x'), new BinaryExpression('-', new Identifier('x'), new Numeral(1))),
          ])
        ),
      ])
    ),
    [5, 4, 3, 2, 1],
  ],
  [
    'sample program',
    new Program(
      new Block([
        new VariableDeclaration(new Identifier('dozen'), new Numeral(12)),
        new PrintStatement(
          new BinaryExpression('%', new Identifier('dozen'), new BinaryExpression('**', new Numeral(3), new Numeral(1)))
        ),
        new FunctionDeclaration(
          new Identifier('gcd'),
          [new Identifier('x'), new Identifier('y')],
          new ConditionalExpression(
            new BinaryExpression('==', new Identifier('y'), new Numeral(0)),
            new Identifier('x'),
            new Call(new Identifier('gcd'), [
              new Identifier('y'),
              new BinaryExpression('%', new Identifier('x'), new Identifier('y')),
            ])
          )
        ),
        new WhileStatement(
          new UnaryExpression(
            '!',
            new BinaryExpression(
              '||',
              new BinaryExpression('>=', new Identifier('dozen'), new Numeral(3)),
              new BinaryExpression(
                '&&',
                new BinaryExpression(
                  '!=',
                  new Call(new Identifier('gcd'), [new Numeral(1), new Numeral(10)]),
                  new Numeral(5)
                ),
                new BooleanLiteral(true)
              )
            )
          ),
          new Block([
            new VariableDeclaration(
              new Identifier('y'),
              new ConditionalExpression(
                new BinaryExpression(
                  '<',
                  new BinaryExpression('+', new Identifier('dozen'), new Numeral(8)),
                  new Numeral(2)
                ),
                new Numeral(1),
                new Identifier('dozen')
              )
            ),
            new Assignment(
              new Identifier('dozen'),
              new BinaryExpression(
                '-',
                new Identifier('dozen'),
                new BinaryExpression(
                  '**',
                  new BinaryExpression('**', new Numeral(2.75e19), new Numeral(1)),
                  new Numeral(3)
                )
              )
            ),
          ])
        ),
      ])
    ),
    [0],
  ],
]

/**
 * Invalid programs that should throw an error
 * Tests will ensure that the program throws an error
 * [description, program]
 */
const invalidPrograms: [string, Program][] = [
  ['! operator on number', new Program(new Block([new PrintStatement(new UnaryExpression('!', new Numeral(5)))]))],
  [
    '- operator on boolean',
    new Program(new Block([new PrintStatement(new UnaryExpression('-', new BooleanLiteral(true)))])),
  ],
  [
    'unknown unary operator',
    new Program(new Block([new PrintStatement(new UnaryExpression('unknown', new Numeral(5)))])),
  ],
  [
    '+ operator on booleans',
    new Program(
      new Block([new PrintStatement(new BinaryExpression('+', new BooleanLiteral(true), new BooleanLiteral(false)))])
    ),
  ],
  [
    '&& operator on numbers',
    new Program(new Block([new PrintStatement(new BinaryExpression('&&', new Numeral(5), new Numeral(3)))])),
  ],
  [
    'division by zero',
    new Program(
      new Block([
        new PrintStatement(
          new BinaryExpression('/', new Numeral(5), new BinaryExpression('-', new Numeral(7), new Numeral(7)))
        ),
      ])
    ),
  ],
  [
    'unknown binary operator',
    new Program(new Block([new PrintStatement(new BinaryExpression('unknown', new Numeral(5), new Numeral(3)))])),
  ],
  [
    'non-boolean condition in conditional expression',
    new Program(
      new Block([new PrintStatement(new ConditionalExpression(new Numeral(5), new Numeral(5), new Numeral(3)))])
    ),
  ],
  [
    'non-array in array subscript expression',
    new Program(new Block([new PrintStatement(new SubscriptExpression(new Numeral(5), new Numeral(0)))])),
  ],
  [
    'non-number as subscript in array subscript expression',
    new Program(
      new Block([
        new PrintStatement(new SubscriptExpression(new ArrayLiteral([new Numeral(1)]), new BooleanLiteral(true))),
      ])
    ),
  ],
  [
    'subscript out of bounds in array subscript expression',
    new Program(
      new Block([
        new PrintStatement(new SubscriptExpression(new ArrayLiteral([new Numeral(1), new Numeral(2)]), new Numeral(2))),
      ])
    ),
  ],
  [
    'declaration of already declared variable',
    new Program(
      new Block([
        new VariableDeclaration(new Identifier('x'), new Numeral(5)),
        new VariableDeclaration(new Identifier('x'), new Numeral(10)),
      ])
    ),
  ],
  [
    'declaration of already declared function',
    new Program(
      new Block([
        new FunctionDeclaration(
          new Identifier('add'),
          [new Identifier('x'), new Identifier('y')],
          new BinaryExpression('+', new Identifier('x'), new Identifier('y'))
        ),
        new FunctionDeclaration(new Identifier('add'), [new Identifier('x'), new Identifier('y')], new Numeral(5)),
      ])
    ),
  ],
  ['assignment to undeclared variable', new Program(new Block([new Assignment(new Identifier('x'), new Numeral(5))]))],
  ['assignment to built-in function', new Program(new Block([new Assignment(new Identifier('sqrt'), new Numeral(5))]))],
  [
    'assignment to user-defined function',
    new Program(
      new Block([
        new FunctionDeclaration(new Identifier('add'), [new Identifier('x'), new Identifier('y')], new Numeral(5)),
        new Assignment(new Identifier('add'), new Numeral(5)),
      ])
    ),
  ],
  ['assignment to built-in constant', new Program(new Block([new Assignment(new Identifier('pi'), new Numeral(5))]))],
  ['accessing undeclared variable', new Program(new Block([new PrintStatement(new Identifier('x'))]))],
  [
    'calling undeclared function',
    new Program(new Block([new PrintStatement(new Call(new Identifier('add'), [new Numeral(5), new Numeral(3)]))])),
  ],
  [
    'calling function with too few arguments',
    new Program(
      new Block([
        new FunctionDeclaration(
          new Identifier('add'),
          [new Identifier('x'), new Identifier('y')],
          new BinaryExpression('+', new Identifier('x'), new Identifier('y'))
        ),
        new PrintStatement(new Call(new Identifier('add'), [new Numeral(5)])),
      ])
    ),
  ],
  [
    'calling function with too many arguments',
    new Program(
      new Block([
        new FunctionDeclaration(
          new Identifier('add'),
          [new Identifier('x'), new Identifier('y')],
          new BinaryExpression('+', new Identifier('x'), new Identifier('y'))
        ),
        new PrintStatement(new Call(new Identifier('add'), [new Numeral(5), new Numeral(3), new Numeral(2)])),
      ])
    ),
  ],
  [
    'calling an identifier that is not a function',
    new Program(
      new Block([
        new VariableDeclaration(new Identifier('x'), new Numeral(5)),
        new PrintStatement(new Call(new Identifier('x'), [new Numeral(5)])),
      ])
    ),
  ],
  [
    'repeated parameter names in function declaration',
    new Program(
      new Block([
        new FunctionDeclaration(new Identifier('g'), [new Identifier('a'), new Identifier('a')], new Numeral(5)),
      ])
    ),
  ],
]

describe('The Bella Interpreter', () => {
  for (const [description, program, output] of validPrograms) {
    it(`produces expected output for ${description}`, () => {
      assert.deepEqual(interpret(program), output)
    })
  }

  for (const [description, program] of invalidPrograms) {
    it(`throws an error for ${description}`, () => {
      assert.throws(() => interpret(program))
    })
  }
})
