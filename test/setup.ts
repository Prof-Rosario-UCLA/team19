import * as chai from 'chai';
import * as sinon from 'sinon';
import sinonChai from 'sinon-chai';
import { faker } from '@faker-js/faker';

const { expect } = chai;

chai.use(sinonChai);

export { expect, sinon, faker };

afterEach(() => {
    sinon.restore();
});
