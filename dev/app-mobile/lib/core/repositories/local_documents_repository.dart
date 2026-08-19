import '../models/signable_document.dart';
import '../storage/local_collection_store.dart';
import 'documents_repository.dart';

/// Offline-first documents repository backed by [LocalCollectionStore].
///
/// On first use it seeds a few realistic pending documents so the "pending"
/// tab is meaningful while there is no backend feeding real documents.
class LocalDocumentsRepository implements DocumentsRepository {
  LocalDocumentsRepository(this._store);

  final LocalCollectionStore _store;

  List<SignableDocument> _read() {
    if (!_store.hasValue) {
      return _seed();
    }
    return _store
        .readAll()
        .map(SignableDocument.fromJson)
        .toList(growable: true);
  }

  List<SignableDocument> _seed() {
    final now = DateTime.now();
    return [
      SignableDocument(
        id: 'seed-regimento',
        title: 'Regimento interno 2026',
        description:
            'Revisão anual do regimento interno do condomínio. Leia o '
            'documento na íntegra e assine para confirmar ciência das novas '
            'regras de convivência e uso das áreas comuns.',
        signUrl: 'https://www.gov.br/governodigital/pt-br/assinatura-eletronica',
        status: DocumentStatus.pendente,
        createdAt: now.subtract(const Duration(days: 3)),
      ),
      SignableDocument(
        id: 'seed-ata-assembleia',
        title: 'Ata da assembleia geral',
        description:
            'Ata da última assembleia geral ordinária, com as deliberações '
            'aprovadas sobre o orçamento e as obras previstas. Sua assinatura '
            'registra a presença e concordância com o conteúdo.',
        signUrl: 'https://www.gov.br/governodigital/pt-br/assinatura-eletronica',
        status: DocumentStatus.pendente,
        createdAt: now.subtract(const Duration(days: 1)),
      ),
      SignableDocument(
        id: 'seed-termo-lazer',
        title: 'Termo de uso da área de lazer',
        description:
            'Termo de responsabilidade para utilização do salão de festas e '
            'da churrasqueira. Necessário para liberar reservas no aplicativo.',
        signUrl: 'https://www.gov.br/governodigital/pt-br/assinatura-eletronica',
        status: DocumentStatus.pendente,
        createdAt: now.subtract(const Duration(hours: 6)),
      ),
    ];
  }

  Future<void> _persist(List<SignableDocument> items) =>
      _store.writeAll(items.map((d) => d.toJson()).toList(growable: false));

  @override
  Future<List<SignableDocument>> getDocuments() async {
    final items = _read();
    if (!_store.hasValue) {
      // Persist the seed so subsequent reads/edits are stable.
      await _persist(items);
    }
    items.sort((a, b) => b.createdAt.compareTo(a.createdAt));
    return items;
  }

  @override
  Future<SignableDocument?> getById(String id) async {
    final items = await getDocuments();
    for (final doc in items) {
      if (doc.id == id) return doc;
    }
    return null;
  }

  @override
  Future<void> markSigned(String id) async {
    final items = _read();
    final index = items.indexWhere((d) => d.id == id);
    if (index == -1) return;
    items[index] = items[index].copyWith(
      status: DocumentStatus.assinado,
      signedAt: DateTime.now(),
    );
    await _persist(items);
  }
}
