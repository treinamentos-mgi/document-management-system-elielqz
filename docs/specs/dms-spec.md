# Especificação - Document Management System

## 1. Objetivo

Entregar uma aplicação web simples para envio, consulta e download de documentos, com persistência de arquivos estritamente local e metadados mantidos em memória.

## 2. Escopo

### Dentro do escopo

- Upload de documentos por meio de uma interface web.
- Listagem dos documentos enviados.
- Download de um documento pelo identificador.
- Gestão simples por usuário por meio do campo `owner` nos metadados.
- Persistência dos arquivos no filesystem local da aplicação.
- Comunicação HTTP entre frontend e backend.

### Fora do escopo

- Armazenamento externo ou em provedores de nuvem.
- Autenticação e autorização completas no MVP.
- Controle de acesso baseado em sessões ou tokens.
- Compartilhamento de documentos entre usuários.
- Versionamento de documentos.
- Exclusão e atualização de documentos.
- Banco de dados ou persistência permanente dos metadados.
- Digitalização, indexação ou busca pelo conteúdo dos arquivos.

## 3. Requisitos funcionais

| ID | Requisito |
| --- | --- |
| RF-01 | O usuário pode enviar um arquivo por formulário multipart. |
| RF-02 | O sistema deve registrar metadados do arquivo enviado: identificador, nome original, tamanho, data/hora e dono. |
| RF-03 | O sistema deve rejeitar uma requisição sem arquivo ou com campo multipart inválido. |
| RF-04 | O sistema deve limitar o tamanho de cada upload a 25 MiB nesta fase. |
| RF-05 | O sistema deve preservar o nome original do arquivo nos metadados sem usá-lo como nome físico do arquivo armazenado. |
| RF-06 | O sistema deve aceitar arquivos de qualquer tipo de conteúdo no MVP. |
| RF-07 | O usuário pode listar os documentos existentes na aplicação. |
| RF-08 | A listagem deve retornar apenas metadados, sem o conteúdo binário dos arquivos. |
| RF-09 | A listagem deve ser ordenada pela data de upload, da mais recente para a mais antiga. |
| RF-10 | O usuário pode baixar um documento pelo identificador exibido na listagem. |
| RF-11 | O download deve devolver o conteúdo original do arquivo e o nome sugerido ao usuário. |
| RF-12 | O sistema deve retornar uma indicação de erro quando o identificador não existir ou o arquivo estiver indisponível. |

## 4. Requisitos não funcionais

| ID | Requisito |
| --- | --- |
| RNF-01 | O backend será implementado em Node.js com Express usando CommonJS. |
| RNF-02 | Os arquivos enviados serão gravados no diretório local `backend/storage` por meio de `multer` com `diskStorage`. |
| RNF-03 | O nome físico armazenado será gerado pelo sistema e protegido contra colisões e alteração indevida de caminho. |
| RNF-04 | Os metadados dos documentos serão mantidos em memória nesta fase inicial. |
| RNF-05 | O reinício da aplicação encerrará os metadados em memória; os arquivos restantes no disco não serão reconstruídos automaticamente. |
| RNF-06 | As configurações, incluindo porta e diretório de armazenamento, serão fornecidas por variáveis de ambiente. |
| RNF-07 | O frontend será implementado em React com Vite. |
| RNF-08 | O frontend deve comunicar-se com o backend por meio de `fetch` e do prefixo `/api`, conforme o proxy configurado pelo Vite. |
| RNF-09 | O backend seguirá uma separação simples de responsabilidades: `routes -> controllers -> services -> repositories`. |
| RNF-10 | Nenhum provedor externo, serviço de nuvem ou armazenamento remoto poderá ser usado para os arquivos. |
| RNF-11 | Erros HTTP devem seguir um formato JSON consistente e não expor caminhos internos ou pilhas de erro ao cliente. |
| RNF-12 | Operações de entrada e saída de arquivos serão tratadas nos limites apropriados da arquitetura e devem produzir respostas HTTP controladas em caso de falha. |

## 5. Modelo de dados

Os metadados dos documentos ficarão armazenados em uma coleção em memória durante a execução da aplicação. Cada entrada terá a seguinte estrutura:

| Campo | Tipo | Obrigatório | Descrição |
| --- | --- | --- | --- |
| `id` | string | Sim | Identificador único gerado pelo servidor. |
| `originalName` | string | Sim | Nome do arquivo recebido no upload, sem aceitar referências a diretórios. |
| `size` | number | Sim | Tamanho do arquivo em bytes. |
| `uploadedAt` | string | Sim | Data/hora do upload em formato ISO 8601. |
| `owner` | string | Não no MVP | Identificador de usuário dono do documento. |
| `storedName` | string | Sim | Nome interno usado pelo sistema no filesystem local. |
| `mimeType` | string | Não | Tipo MIME informado pelo cliente ou identificado pelo middleware. |

### Regras do modelo

- `id` deve ser único dentro da execução atual da aplicação.
- `originalName` representa o nome enviado pelo cliente e não o nome físico usado no disco.
- `storedName` não deve ser exposto diretamente pelas respostas de listagem.
- `size` deve representar a quantidade real de bytes gravados pelo multer.
- `uploadedAt` deve ser criado pelo backend no momento da conclusão do upload.
- `owner` é reservado para gestão simples por usuário. Como não há autenticação no MVP, o valor pode ser atribuído por uma convenção interna definida na implementação futura.
- Os metadados são voláteis e não são sincronizados com os arquivos encontrados em disco ao iniciar o sistema.
- Não será criado persistência em banco de dados nesta fase.

## 6. Contratos de API

Todas as respostas JSON devem usar `Content-Type: application/json`. Os endpoints previstos funcionam sob o servidor Express e são acessados pelo frontend por meio do prefixo `/api`.

### 6.1 POST /upload

Envia um único documento por `multipart/form-data`.

**Entrada**

- Campo multipart: `file`.
- Tipo: arquivo.
- Limite: 25 MiB por requisição.

Exemplo conceptual:

```text
multipart/form-data
campo: file
```

**Respostas**

`201 Created`

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "originalName": "contrato.pdf",
  "size": 245760,
  "uploadedAt": "2026-11-23T15:30:00.000Z",
  "owner": "default-user",
  "mimeType": "application/pdf"
}

```

`400 Bad Request` quando não existir campo `file` ou o upload não puder ser processado como um único arquivo válido.

```json
{
  "error": {
    "code": "INVALID_UPLOAD",
    "message": "Nenhum arquivo foi enviado."
  }
}
```

`413 Payload Too Large` quando o arquivo ultrapassar 25 MiB.

```json
{
  "error": {
    "code": "FILE_TOO_LARGE",
    "message": "O arquivo excede o limite de 25 MiB."
  }
}
```

`500 Internal Server Error` para falha na gravação do arquivo ou na criação dos metadados.

### 6.2 GET /documents

Lista os metadados dos documentos registrados na execução atual.

**Saída**

`200 OK`

```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "originalName": "contrato.pdf",
    "size": 245760,
    "uploadedAt": "2026-11-23T15:30:00.000Z",
    "owner": "default-user",
    "mimeType": "application/pdf"
  }
]
```

Quando não houver documentos, o retorno será uma lista vazia:

```json
[]
```

Se autenticação ou filtro por usuário forem introduzidos posteriormente, o contrato poderá incluir o parâmetro de usuário, mas essa regra não faz parte do MVP.

### 6.3 GET /documents/:id/download

Baixa o conteúdo do documento identificado por `id`.

**Saída de sucesso**

`200 OK`

- `Content-Type`: tipo MIME registrado no metadado ou `application/octet-stream` como fallback.
- `Content-Disposition`: `attachment; filename="nome-original"`.
- Corpo: conteúdo binário do arquivo.

**Erros**

`404 Not Found` quando o identificador não existir ou o metadado estiver ausente.

```json
{
  "error": {
    "code": "DOCUMENT_NOT_FOUND",
    "message": "Documento não encontrado."
  }
}
```

`404 Not Found` ou `410 Gone` podem ser usados para arquivo ausente no filesystem; o MVP usa `404` para simplificar a mensagem ao cliente.

`400 Bad Request` quando o identificador tiver formato inválido, caso o formato seja validado pelo backend.

`500 Internal Server Error` quando houver falha na leitura do arquivo.

### 6.4 Health check

A aplicação já possui o endpoint auxiliar `GET /health`, que não faz parte dos contratos funcionais centrais de documentos.

`200 OK`

```json
{
  "status": "ok"
}
```

## 7. Decisões arquiteturais

### 7.1 Backend

O backend será organizado em quatro responsabilidades simples:

- `routes`: registra endpoints e delega a entrada para os controllers.
- `controllers`: valida dados básicos da requisição e formata respostas HTTP.
- `services`: contém regras de negócio do upload, listagem e download.
- `repositories`: mantém os metadados em memória e informa ao service o local físico dos arquivos.

O fluxo de dependência será unidirecional: `routes -> controllers -> services -> repositories`. O multer e o filesystem serão usados pela camada responsável pelo upload dentro desse fluxo, sem espalhar a lógica de armazenamento pelos controllers.

### 7.2 Upload

O `multer` será configurado com `diskStorage` e gravará os arquivos diretamente em `backend/storage`. O diretório de destino pode ser configurado por variável de ambiente, mas, por padrão, será relativo à raiz do backend.

O middleware do multer deve:

- definir um diretório local obrigatório;
- usar nomes físicos gerados pelo servidor;
- impedir que o nome original determine o caminho no disco;
- limitar o tamanho em 25 MiB;
- remover ou não registrar metadados caso a gravação ou criação dos metadados falhe.

### 7.3 Metadados

Os metadados ficarão em memória em uma estrutura controlada pelo repository. Essa solução é deliberadamente simples para o MVP e não oferece persistência entre reinícios.

Os arquivos já presentes no diretório `backend/storage` não serão indexados automaticamente na inicialização. Portanto, listagem e download só reconhecerão documentos que tenham metadados criados durante a execução atual.

### 7.4 Frontend

O frontend será organizado em componentes, páginas e serviços:

- `components`: elementos reutilizáveis de interface.
- `pages`: telas de upload e listagem/download.
- `services`: chamadas HTTP com `fetch` para o backend.

O frontend deve consumir os mesmos metadados da API e evitar a duplicação da lógica de formatação ou comunicação HTTP.

### 7.5 Configuração

As configurações sensíveis ao ambiente serão fornecidas por variáveis de ambiente, conforme os princípios 12-Factor. A porta e o diretório de arquivos são candidatos iniciais para configuração. Valores padrão podem existir apenas para desenvolvimento local.

## 8. Plano de execução

As etapas abaixo são apenas um plano para implementação posterior. Esta etapa não executará nenhuma implementação do backend ou frontend.

1. Preparar os arquivos-base do backend para Express e adicionar a configuração central de variáveis de ambiente.
2. Implementar o repository em memória para criar, listar e localizar metadados de documentos.
3. Implementar o service que valide uploads, registre metadados e resolva downloads.
4. Implementar o controller e o tratamento padronizado de erros HTTP.
5. Implementar as rotas `POST /upload`, `GET /documents` e `GET /documents/:id/download`.
6. Configurar o multer com `diskStorage`, limite de 25 MiB e o diretório local `backend/storage`.
7. Implementar testes automatizados de upload, listagem, download, erros e inicialização isolada do app.
8. Implementar o serviço de comunicação do frontend usando `fetch` e o prefixo `/api`.
9. Implementar a interface de seleção e envio de arquivos, estados de sucesso/erro e lista de documentos.
10. Implementar a ação de download na interface e apresentar o nome, tamanho e data dos documentos.
11. Integrar frontend e backend pelo proxy do Vite e validar os fluxos completos em ambiente local.
12. Executar os testes backend existentes e ampliar a cobertura para os requisitos da especificação.

## 9. Critérios de aceitação

- Um arquivo válido enviado por multipart é gravado em `backend/storage` e retorna metadados em `201`.
- Um upload sem arquivo ou com campo diferente de `file` retorna `400`.
- Um arquivo acima de 25 MiB retorna `413` e não é registrado na listagem.
- `GET /documents` retorna todos os metadados da execução atual em ordem decrescente de `uploadedAt`.
- `GET /documents` retorna `[]` quando não existem documentos.
- `GET /documents/:id/download` devolve o arquivo correto como anexo.
- Um identificador inexistente retorna `404`.
- Nenhuma resposta da API expõe `storedName` ou caminhos físicos internos.
- Reiniciar o processo limpa a listagem em memória sem pretender reconstruir os metadados a partir do disco.
- Nenhum armazenamento externo ou serviço de nuvem participa do fluxo.
