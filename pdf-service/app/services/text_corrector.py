"""Portuguese text correction for OCR output."""
import re
from typing import Dict, List, Set


class PortugueseTextCorrector:
    """Corrects common OCR errors in Portuguese text."""

    # Common Portuguese words that often lose accents in OCR
    ACCENT_CORRECTIONS: Dict[str, str] = {
        # Não/Nao variations
        "nao": "não",
        "entao": "então",
        "sao": "são",
        "estao": "estão",
        "serao": "serão",
        "terao": "terão",
        "farao": "farão",
        "dirao": "dirão",
        "irao": "irão",
        "poderao": "poderão",
        "deverao": "deverão",
        "estarao": "estarão",
        # Ção endings
        "acao": "ação",
        "informacao": "informação",
        "comunicacao": "comunicação",
        "educacao": "educação",
        "situacao": "situação",
        "organizacao": "organização",
        "administracao": "administração",
        "producao": "produção",
        "construcao": "construção",
        "solucao": "solução",
        "funcao": "função",
        "relacao": "relação",
        "populacao": "população",
        "operacao": "operação",
        "aplicacao": "aplicação",
        "apresentacao": "apresentação",
        "realizacao": "realização",
        "publicacao": "publicação",
        "instalacao": "instalação",
        "negociacao": "negociação",
        "avaliacao": "avaliação",
        "classificacao": "classificação",
        "documentacao": "documentação",
        "configuracao": "configuração",
        "legislacao": "legislação",
        "regulamentacao": "regulamentação",
        "autorizacao": "autorização",
        "notificacao": "notificação",
        "declaracao": "declaração",
        "inscricao": "inscrição",
        "descricao": "descrição",
        "prescricao": "prescrição",
        "transacao": "transação",
        "excecao": "exceção",
        "atencao": "atenção",
        "prevencao": "prevenção",
        "manutencao": "manutenção",
        "retencao": "retenção",
        "intencao": "intenção",
        "mencao": "menção",
        "dimensao": "dimensão",
        "extensao": "extensão",
        "compreensao": "compreensão",
        "discussao": "discussão",
        "conclusao": "conclusão",
        "decisao": "decisão",
        "revisao": "revisão",
        "divisao": "divisão",
        "precisao": "precisão",
        "versao": "versão",
        "sessao": "sessão",
        "emissao": "emissão",
        "transmissao": "transmissão",
        "permissao": "permissão",
        "admissao": "admissão",
        "comissao": "comissão",
        "missao": "missão",
        "pressao": "pressão",
        "expressao": "expressão",
        "impressao": "impressão",
        "profissao": "profissão",
        "possessao": "possessão",
        "confissao": "confissão",
        # Você/Voce
        "voce": "você",
        "voces": "vocês",
        # É/E (context-dependent, common cases)
        "ja": "já",
        "so": "só",
        "ate": "até",
        "apos": "após",
        "atraves": "através",
        "tres": "três",
        "pos": "pós",
        "pre": "pré",
        # Á/A
        "agua": "água",
        "area": "área",
        "numero": "número",
        "pagina": "página",
        "unico": "único",
        "ultimo": "último",
        "publico": "público",
        "politica": "política",
        "economica": "econômica",
        "tecnica": "técnica",
        "pratica": "prática",
        "automatica": "automática",
        "informatica": "informática",
        "matematica": "matemática",
        "estatistica": "estatística",
        "logistica": "logística",
        # Common words
        "tambem": "também",
        "porem": "porém",
        "alem": "além",
        "alguem": "alguém",
        "ninguem": "ninguém",
        "contem": "contém",
        "mantem": "mantém",
        "obtem": "obtém",
        "retem": "retém",
        "provem": "provém",
        "intervem": "intervém",
        # Ê words
        "ele": "ele",  # Keep as is, but watch for context
        "voce": "você",
        "existencia": "existência",
        "experiencia": "experiência",
        "referencia": "referência",
        "conferencia": "conferência",
        "preferencia": "preferência",
        "diferenca": "diferença",
        "frequencia": "frequência",
        "sequencia": "sequência",
        "consequencia": "consequência",
        "ciencia": "ciência",
        "consciencia": "consciência",
        "audiencia": "audiência",
        "eficiencia": "eficiência",
        "tendencia": "tendência",
        "evidencia": "evidência",
        "emergencia": "emergência",
        "urgencia": "urgência",
        "agencia": "agência",
        "gerencia": "gerência",
        # Õ words
        "noes": "nões",
        "acoes": "ações",
        "informacoes": "informações",
        "condicoes": "condições",
        "operacoes": "operações",
        "opcoes": "opções",
        "solucoes": "soluções",
        "funcoes": "funções",
        "relacoes": "relações",
        "posicoes": "posições",
        "instituicoes": "instituições",
        "organizacoes": "organizações",
        "aplicacoes": "aplicações",
        "publicacoes": "publicações",
        "comunicacoes": "comunicações",
        "negociacoes": "negociações",
        "avaliacoes": "avaliações",
        "situacoes": "situações",
        "decisoes": "decisões",
        "discussoes": "discussões",
        "conclusoes": "conclusões",
        "revisoes": "revisões",
        "versoes": "versões",
        "sessoes": "sessões",
        "emissoes": "emissões",
        "expressoes": "expressões",
        "impressoes": "impressões",
        "profissoes": "profissões",
        "dimensoes": "dimensões",
        "extensoes": "extensões",
        # Ç words
        "preco": "preço",
        "servico": "serviço",
        "espaco": "espaço",
        "endereco": "endereço",
        "comeco": "começo",
        "almoco": "almoço",
        "forca": "força",
        "licenca": "licença",
        "crianca": "criança",
        "seguranca": "segurança",
        "esperanca": "esperança",
        "mudanca": "mudança",
        "lideranca": "liderança",
        "confianca": "confiança",
        "importancia": "importância",
        "distancia": "distância",
        "tolerancia": "tolerância",
        "vigilancia": "vigilância",
        "substancia": "substância",
        "instancia": "instância",
        "constancia": "constância",
        # Verbs
        "faca": "faça",
        "deca": "deça",
        "traca": "traça",
        "comeca": "começa",
        "conheca": "conheça",
        "apareca": "apareça",
        "ofereca": "ofereça",
        "esqueca": "esqueça",
        "estabeleca": "estabeleça",
        "permaneca": "permaneça",
        "cresca": "cresça",
        "pareca": "pareça",
        # Misc common words
        "pais": "país",
        "saude": "saúde",
        "conteudo": "conteúdo",
        "individuo": "indivíduo",
        "residuo": "resíduo",
        "continuo": "contínuo",
        "obvio": "óbvio",
        "obvia": "óbvia",
        "necessario": "necessário",
        "necessaria": "necessária",
        "primario": "primário",
        "secundario": "secundário",
        "ordinario": "ordinário",
        "extraordinario": "extraordinário",
        "contrario": "contrário",
        "temporario": "temporário",
        "voluntario": "voluntário",
        "funcionario": "funcionário",
        "proprietario": "proprietário",
        "secretario": "secretário",
        "comentario": "comentário",
        "calendario": "calendário",
        "horario": "horário",
        "salario": "salário",
        "formulario": "formulário",
        "relatorio": "relatório",
        "laboratorio": "laboratório",
        "territorio": "território",
        "escritorio": "escritório",
        "repositorio": "repositório",
        "historico": "histórico",
        "eletronico": "eletrônico",
        "economico": "econômico",
        "tecnico": "técnico",
        "mecanico": "mecânico",
        "organico": "orgânico",
        "especifico": "específico",
        "cientifico": "científico",
        "pacifico": "pacífico",
        "magnifico": "magnífico",
    }

    # Common OCR character confusions
    CHARACTER_FIXES: List[tuple] = [
        # Common OCR mistakes
        (r'\brn\b', 'm'),  # "rn" often misread as "m" - be careful with word boundaries
        (r'(?<=[a-záàâãéêíóôõúç])0(?=[a-záàâãéêíóôõúç])', 'o'),  # 0 in middle of word → o
        (r'(?<=[a-záàâãéêíóôõúç])1(?=[a-záàâãéêíóôõúç])', 'l'),  # 1 in middle of word → l
        (r'(?<=[a-záàâãéêíóôõúç])5(?=[a-záàâãéêíóôõúç])', 's'),  # 5 in middle of word → s
        (r'\bl\b', 'I'),  # Standalone "l" often should be "I"
        (r'(?<=\s)l(?=\s)', 'I'),  # "l" surrounded by spaces → "I"
        (r'(?<=[A-Z])l(?=[a-z])', 'I'),  # "l" after uppercase before lowercase → "I"
    ]

    # Patterns that suggest Portuguese text
    PORTUGUESE_INDICATORS: Set[str] = {
        "de", "da", "do", "das", "dos", "em", "no", "na", "nos", "nas",
        "para", "por", "com", "sem", "sobre", "entre", "até", "desde",
        "que", "qual", "quais", "quem", "como", "quando", "onde", "porque",
        "este", "esta", "estes", "estas", "esse", "essa", "esses", "essas",
        "aquele", "aquela", "aqueles", "aquelas", "isto", "isso", "aquilo",
        "um", "uma", "uns", "umas", "o", "a", "os", "as",
        "seu", "sua", "seus", "suas", "meu", "minha", "meus", "minhas",
        "nosso", "nossa", "nossos", "nossas", "vosso", "vossa",
        "ele", "ela", "eles", "elas", "você", "vocês", "nós", "eu", "tu",
        "ser", "estar", "ter", "haver", "fazer", "poder", "dever", "querer",
        "foi", "eram", "seria", "sendo", "sido", "estado", "tendo", "tido",
        "muito", "muita", "muitos", "muitas", "pouco", "poucos", "todo", "toda",
        "outro", "outra", "outros", "outras", "mesmo", "mesma", "próprio",
        "mais", "menos", "bem", "mal", "já", "ainda", "sempre", "nunca",
        "também", "porém", "contudo", "entretanto", "todavia", "portanto",
    }

    def __init__(self):
        # Build case-insensitive correction map
        self._corrections_lower = {k.lower(): v for k, v in self.ACCENT_CORRECTIONS.items()}

    def is_portuguese(self, text: str) -> bool:
        """Detect if text is likely Portuguese."""
        words = set(text.lower().split())
        matches = words.intersection(self.PORTUGUESE_INDICATORS)
        # If more than 5% of unique words are Portuguese indicators, consider it Portuguese
        if len(words) == 0:
            return False
        return len(matches) / len(words) > 0.05 or len(matches) >= 5

    def correct_text(self, text: str, language: str = "por") -> str:
        """Apply Portuguese text corrections."""
        if language not in ("por", "pt", "portuguese"):
            # Only correct Portuguese text
            return text

        # Apply character fixes first
        corrected = text
        for pattern, replacement in self.CHARACTER_FIXES:
            corrected = re.sub(pattern, replacement, corrected, flags=re.IGNORECASE)

        # Apply word-level accent corrections
        words = corrected.split()
        corrected_words = []

        for word in words:
            # Preserve original case pattern
            word_lower = word.lower().strip('.,;:!?()[]{}"\'-')
            punctuation_before = ""
            punctuation_after = ""

            # Extract punctuation
            i = 0
            while i < len(word) and not word[i].isalnum():
                punctuation_before += word[i]
                i += 1
            j = len(word) - 1
            while j >= 0 and not word[j].isalnum():
                punctuation_after = word[j] + punctuation_after
                j -= 1

            core_word = word[i:j+1] if j >= i else word
            core_word_lower = core_word.lower()

            if core_word_lower in self._corrections_lower:
                correction = self._corrections_lower[core_word_lower]
                # Apply original case pattern
                if core_word.isupper():
                    correction = correction.upper()
                elif core_word and core_word[0].isupper():
                    correction = correction.capitalize()
                corrected_words.append(punctuation_before + correction + punctuation_after)
            else:
                corrected_words.append(word)

        return " ".join(corrected_words)

    def correct_ocr_output(self, text: str, language: str = "auto") -> str:
        """Main entry point for OCR text correction."""
        if language == "auto":
            language = "por" if self.is_portuguese(text) else "eng"

        if language in ("por", "pt", "portuguese"):
            return self.correct_text(text, "por")

        return text
