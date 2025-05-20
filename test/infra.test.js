import { expect } from 'chai';
import sinon from 'sinon';
import { faker } from '@faker-js/faker';

describe('Testing Infrastructure', () => {
    describe('Chai Assertions', () => {
        it('completes basic assertions', () => {
            expect(true).to.be.true;
            expect(false).to.be.false;
            expect(1 + 1).to.equal(2);
            expect('hello').to.be.a('string');
            expect([1, 2, 3]).to.have.lengthOf(3);
        });

        it('completes complex assertions', () => {
            const obj = { a: 1, b: 'two', c: [3] };
            expect(obj).to.have.property('b', 'two');
            expect(obj).to.deep.equal({ a: 1, b: 'two', c: [3] });
            expect(obj.c).to.be.an('array').that.includes(3);
        });
    });

    describe('Sinon Functionality', () => {
        it('supports spies', () => {
            const spy = sinon.spy();
            spy('hello');
            expect(spy.calledOnce).to.be.true;
            expect(spy.calledWith('hello')).to.be.true;
        });

        it('supports stubs', () => {
            const stub = sinon.stub();
            stub.returns(42);
            expect(stub()).to.equal(42);
        });

        it('supports mocks', () => {
            const mock = sinon.mock();
            mock.once().returns(true);
            expect(mock()).to.be.true;
        });

        it('supports method replacement', () => {
            const obj = {
                method: function() { return 'original'; }
            };

            const stub = sinon.stub(obj, 'method');
            stub.returns('stubbed');

            expect(obj.method()).to.equal('stubbed');
            expect(stub.calledOnce).to.be.true;
        });

        it('restores stubs after each test', () => {
            const obj = {
                method: function() { return 'original'; }
            };

            const stub = sinon.stub(obj, 'method');
            stub.returns('stubbed');
        });

        it('restores previous stubs', () => {
            const obj = {
                method: function() { return 'original'; }
            };

            expect(obj.method()).to.equal('original');
        });
    });

    describe('Faker Functionality', () => {
        it('generates random data', () => {
            const name = faker.person.fullName();
            expect(name).to.be.a('string');
            expect(name.length).to.be.greaterThan(0);

            const email = faker.internet.email();
            expect(email).to.be.a('string');
            expect(email).to.include('@');

            const cardValue = faker.helpers.arrayElement(['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A']);
            expect(['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A']).to.include(cardValue);
        });
    });
});