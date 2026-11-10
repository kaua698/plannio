import bcrypt from 'bcryptjs';

// bcrypt em JavaScript puro: não depende de binário nativo, o que simplifica a hospedagem.
export function createHasher({ rounds = 10 } = {}) {
  return {
    hash: (password) => bcrypt.hash(password, rounds),
    verify: (password, stored) => bcrypt.compare(password, stored),
  };
}
