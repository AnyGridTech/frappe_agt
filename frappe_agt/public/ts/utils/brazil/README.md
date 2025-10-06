# Brazil Utils - Organização dos Arquivos

Esta pasta contém utilitários específicos para validação e formatação de dados brasileiros.

## Estrutura dos Arquivos

### CEP (Código de Endereçamento Postal)
- **Arquivo**: `cep.ts`
- **Responsabilidades**:
  - Validação de CEP
  - Formatação automática (00000-000)
  - Consulta automática de endereço via API
  - Preenchimento automático de campos de endereço

### Telefone
- **Arquivo**: `phone.ts`  

- **Arquivo**: `phone.ts`- **Responsabilidades**:

- **Tipos**: `phone.types.ts`  - Validação de números de telefone brasileiros

- **Responsabilidades**:  - Formatação automática ((xx) xxxxx-xxxx ou (xx) xxxx-xxxx)

  - Validação de números de telefone brasileiros  - Diferenciação entre telefone fixo e celular

  - Formatação automática ((00) 00000-0000 ou (00) 0000-0000)  - Validação de DDD

  - Diferenciação entre telefone fixo e celular

  - Validação de DDD### CPF (Cadastro de Pessoas Físicas)

- **Arquivo**: `cpf.ts`

### CPF (Cadastro de Pessoas Físicas)- **Responsabilidades**:

- **Arquivo**: `cpf.ts`  - Validação de CPF

- **Responsabilidades**:  - Formatação automática (xxx.xxx.xxx-xx)

  - Validação de CPF  - Cálculo de dígitos verificadores

  - Formatação automática (000.000.000-00)

  - Cálculo de dígitos verificadores### CNPJ (Cadastro Nacional da Pessoa Jurídica)

- **Arquivo**: `cnpj.ts`

### CNPJ (Cadastro Nacional da Pessoa Jurídica)- **Responsabilidades**:

- **Arquivo**: `cnpj.ts`  - Validação de CNPJ

- **Responsabilidades**:  - Formatação automática (xx.xxx.xxx/xxxx-xx)

  - Validação de CNPJ  - Cálculo de dígitos verificadores

  - Formatação automática (00.000.000/0000-00)  - Verificação de existência via API

  - Cálculo de dígitos verificadores

  - Verificação de existência via API### CPF/CNPJ Misto

- **Arquivo**: `cpf_cnpj.ts`

### CPF/CNPJ Misto- **Responsabilidades**:

- **Arquivo**: `cpf_cnpj.ts`  - Auto-detecção de tipo de documento

- **Responsabilidades**:  - Formatação inteligente baseada no tamanho

  - Auto-detecção de tipo de documento  - Validação unificada

  - Formatação inteligente baseada no tamanho

  - Validação unificada## Tipagens



## TipagensTodos os arquivos utilizam tipagens do pacote `@anygridtech/frappe-agt-types` para garantir type safety:



Os tipos estão organizados em arquivos separados seguindo o padrão:- `FrappeForm` para formulários do Frappe

- `cep.types.ts` - Tipos para CEP (CepApiResponse, ValidationStatus)- Interfaces específicas para respostas de API

- `phone.types.ts` - Tipos para telefone (PhoneValidationResult, ValidationStatus)- Types para status de validação

- Documentação completa via JSDoc

Todos os arquivos utilizam tipagens do pacote `@anygridtech/frappe-agt-types` para garantir type safety:

- `FrappeForm` para formulários do Frappe## Uso

- Interfaces específicas para respostas de API

- Types para status de validação```typescript

- Documentação completa via JSDoc// CEP

agt.utils.brazil.cep.validate(frm, 'cep_field', 'address_field', 'neighborhood_field', 'city_field', 'state_field');

## Usoagt.utils.brazil.cep.format(frm, 'cep_field');



```typescript// Telefone

// CEPagt.utils.brazil.phone.validate(frm, 'phone_field');

agt.utils.brazil.cep.validate(frm, 'cep_field', 'address_field', 'neighborhood_field', 'city_field', 'state_field');agt.utils.brazil.phone.format(frm, 'phone_field');

agt.utils.brazil.cep.format(frm, 'cep_field');

// CPF

// Telefoneagt.utils.brazil.cpf.validate(frm, 'cpf_field');

agt.utils.brazil.phone.validate(frm, 'phone_field');agt.utils.brazil.cpf.format(frm, 'cpf_field');

agt.utils.brazil.phone.format(frm, 'phone_field');

// CNPJ

// CPFagt.utils.brazil.cnpj.validate(frm, 'cnpj_field');

agt.utils.brazil.cpf.validate(frm, 'cpf_field');agt.utils.brazil.cnpj.format(frm, 'cnpj_field');

agt.utils.brazil.cpf.format(frm, 'cpf_field');agt.utils.brazil.cnpj.validate_existence(frm, 'cnpj_field');



// CNPJ// Misto

agt.utils.brazil.cnpj.validate(frm, 'cnpj_field');agt.utils.brazil.validate_cnpj_or_cpf(frm, 'document_field', 'cpf');

agt.utils.brazil.cnpj.format(frm, 'cnpj_field');agt.utils.brazil.format_cnpj_or_cpf(frm, 'document_field', 'cnpj');

agt.utils.brazil.cnpj.validate_existence(frm, 'cnpj_field');```



// Misto## Benefícios da Separação

agt.utils.brazil.validate_cnpj_or_cpf(frm, 'document_field', 'cpf');

agt.utils.brazil.format_cnpj_or_cpf(frm, 'document_field', 'cnpj');1. **Manutenibilidade**: Cada funcionalidade em seu próprio arquivo

```2. **Reutilização**: Facilita imports específicos

3. **Type Safety**: Tipagens adequadas para cada função

## Estrutura Final:4. **Documentação**: JSDoc completo em todas as funções

```5. **Organização**: Estrutura clara e lógica
brazil/
├── cep.ts           # Validação e formatação de CEP
├── cep.types.ts     # Tipos para CEP
├── phone.ts         # Validação e formatação de telefone  
├── phone.types.ts   # Tipos para telefone
├── cpf.ts           # Validação e formatação de CPF
├── cnpj.ts          # Validação e formatação de CNPJ
├── cpf_cnpj.ts      # Validação mista CPF/CNPJ
├── index.ts         # Imports centralizados
└── README.md        # Documentação
```

## Benefícios da Organização

1. **Separação de Responsabilidades**: Cada funcionalidade em seu próprio arquivo
2. **Tipos Isolados**: Interfaces e types em arquivos dedicados para melhor organização
3. **Reutilização**: Facilita imports específicos
4. **Type Safety**: Tipagens adequadas para cada função
5. **Documentação**: JSDoc completo em todas as funções
6. **Manutenibilidade**: Estrutura clara e lógica para facilitar manutenção