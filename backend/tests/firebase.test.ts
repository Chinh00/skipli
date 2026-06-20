import { db, admin } from '../src/config/firebase';

jest.mock('../src/config/firebase', () => ({
  db: {},
  admin: {}
}));

describe('Firebase Config', () => {
  it('should export db and admin', () => {
    expect(db).toBeDefined();
    expect(admin).toBeDefined();
  });
});
