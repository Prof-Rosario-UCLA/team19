import chai from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import { faker } from '@faker-js/faker';

chai.use(sinonChai);

export const expect = chai.expect;
export { sinon, faker };

afterEach(() => {
    sinon.restore();
});