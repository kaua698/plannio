// Erro de regra de negócio, com o mesmo formato que a API devolve.
export class AppError extends Error {
  constructor(status, code, message, fields, extra = {}) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
    if (fields) this.fields = fields;
    Object.assign(this, extra);
  }
}

export const MESSAGES = {
  name: 'Informe o nome da atividade.',
  end: 'O término precisa ser depois do início.',
  notFound: 'Esta atividade não foi encontrada.',
  overlap: 'Este horário se sobrepõe a outra atividade. Deseja manter assim?',
  agendaChanged: 'Sua agenda mudou enquanto você decidia. Atualizamos as opções.',
  invalid: 'Confira os dados informados.',
};

export const invalid = (fields, message = MESSAGES.invalid) => new AppError(400, 'VALIDATION_ERROR', message, fields);
export const notFound = (message = MESSAGES.notFound) => new AppError(404, 'NOT_FOUND', message);
