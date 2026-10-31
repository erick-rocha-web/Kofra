const POR_CODIGO: Record<string, string> = {
  invalid_credentials: 'E-mail ou senha errados.',
  user_already_exists: 'Este e-mail já está cadastrado. Tente entrar.',
  email_exists: 'Este e-mail já está cadastrado. Tente entrar.',
  signup_disabled: 'O cadastro de novas contas está fechado no momento.',
  email_provider_disabled: 'O cadastro de novas contas está fechado no momento.',
  weak_password: 'Senha curta: use pelo menos 8 caracteres.',
  same_password: 'A senha nova precisa ser diferente da atual.',
  over_email_send_rate_limit: 'Muitos e-mails enviados em pouco tempo. Espere um pouco e tente de novo.',
  over_request_rate_limit: 'Muitas tentativas em pouco tempo. Espere um pouco e tente de novo.',
  email_address_invalid: 'Confira o e-mail digitado.',
  email_address_not_authorized: 'Não foi possível enviar o e-mail para este endereço por enquanto.',
  validation_failed: 'Confira o e-mail digitado.',
};

export const SEM_INTERNET = 'Sem internet. Confira a conexão e tente de novo.';

export function mensagemErroAuth(e: { code?: string; message?: string; name?: string }, online = true): string {
  if (e.code && POR_CODIGO[e.code]) return POR_CODIGO[e.code];
  const m = e.message ?? '';
  if (!online || e.name === 'AuthRetryableFetchError' || /failed to fetch|network|load failed/i.test(m)) return SEM_INTERNET;
  if (/invalid login/i.test(m)) return POR_CODIGO.invalid_credentials;
  if (/already (been )?registered/i.test(m)) return POR_CODIGO.user_already_exists;
  if (/signups? not allowed/i.test(m)) return POR_CODIGO.signup_disabled;
  if (/password should be at least/i.test(m)) return POR_CODIGO.weak_password;
  return 'Não foi possível concluir agora. Tente de novo.';
}
