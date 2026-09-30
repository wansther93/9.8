import React, { useState, useMemo } from 'react';
import {
  X,
  Sparkles,
  Heart,
  Star,
  Plus,
  Check,
  Search,
  BookmarkPlus,
  Zap,
  TrendingUp,
  Compass,
  Layers,
  ChevronRight,
  Flame,
} from 'lucide-react';
import type { Anime } from '../../types';
import type { UserProfile } from '../../services/profileService';
import { calculateCompatibilityScore } from '../../services/communityService';
import { PROFILE_THEMES, ARCHETYPES } from './socialThemes';

export interface CollectionVersusModalProps {
  isOpen: boolean;
  onClose: () => void;
  myAnimes: Anime[];
  myProfile?: UserProfile | null;
  myUserName?: string;
  myAvatar?: string;
  friendAnimes?: Anime[];
  friendProfile?: UserProfile | null;
  friendUserName?: string;
  friendAvatar?: string;
  // Aliases compatíveis com OtakuProfileView
  targetAnimes?: Anime[];
  targetProfile?: UserProfile | null;
  onAddAnimeToMyList?: (animeData: Partial<Anime>) => void;
  onAddAnimeFromFriend?: (anime: Anime | Partial<Anime>) => void;
  onOpenAnimeDetail?: (anime: Anime) => void;
}

export const CollectionVersusModal: React.FC<CollectionVersusModalProps> = ({
  isOpen,
  onClose,
  myAnimes = [],
  myProfile = null,
  myUserName,
  myAvatar,
  friendAnimes,
  friendProfile,
  friendUserName,
  friendAvatar,
  targetAnimes,
  targetProfile,
  onAddAnimeToMyList,
  onAddAnimeFromFriend,
  onOpenAnimeDetail,
}) => {
  // Abas de navegação da Sintonia Otaku
  const [activeTab, setActiveTab] = useState<'mutual' | 'discover' | 'divergence' | 'full_list'>('mutual');
  const [listFilter, setListFilter] = useState<'all' | 'completed' | 'watching' | 'favorites'>('all');
  const [listSearch, setListSearch] = useState('');
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [addedAnimeIds, setAddedAnimeIds] = useState<Set<string>>(new Set());

  // Resolução segura de listas de animes
  const safeMyAnimes = useMemo(() => (Array.isArray(myAnimes) ? myAnimes : []), [myAnimes]);
  const safeFriendAnimes = useMemo(() => {
    if (Array.isArray(friendAnimes) && friendAnimes.length > 0) return friendAnimes;
    if (Array.isArray(targetAnimes) && targetAnimes.length > 0) return targetAnimes;
    if (Array.isArray(friendAnimes)) return friendAnimes;
    if (Array.isArray(targetAnimes)) return targetAnimes;
    return [];
  }, [friendAnimes, targetAnimes]);

  const effectiveMyProfile = myProfile || null;
  const effectiveFriendProfile = friendProfile || targetProfile || null;

  const effectiveMyUserName = myUserName || effectiveMyProfile?.publicUsername || 'Você';
  const effectiveMyAvatar = myAvatar || effectiveMyProfile?.customAvatarUrl || '';

  const effectiveFriendUserName = friendUserName || effectiveFriendProfile?.publicUsername || 'Amigo';
  const effectiveFriendAvatar = friendAvatar || effectiveFriendProfile?.customAvatarUrl || '';

  // Calcular pontuação de ressonância e afinidade de gosto
  const compatibility = useMemo(() => {
    return calculateCompatibilityScore(safeMyAnimes, safeFriendAnimes);
  }, [safeMyAnimes, safeFriendAnimes]);

  // Set de títulos normalizados para conferir presença rápida na coleção do usuário
  const myAnimeTitles = useMemo(() => {
    return new Set(
      safeMyAnimes.map((a) => (a.title || '').trim().toLowerCase()).filter(Boolean)
    );
  }, [safeMyAnimes]);

  // Animes que ambos assistiram (Mútuos)
  const mutualAnimesList = useMemo(() => {
    const friendMap = new Map<string, Anime>();
    for (const a of safeFriendAnimes) {
      const key = (a.title || '').trim().toLowerCase();
      if (key) friendMap.set(key, a);
      if (a.id) friendMap.set(String(a.id), a);
    }

    const list: Array<{
      myAnime: Anime;
      friendAnime: Anime;
      myScore: number;
      friendScore: number;
      scoreDiff: number;
      isMasterpiece: boolean;
    }> = [];

    for (const myAnime of safeMyAnimes) {
      const key = (myAnime.title || '').trim().toLowerCase();
      const friendMatch = friendMap.get(key) || (myAnime.id ? friendMap.get(String(myAnime.id)) : undefined);
      if (friendMatch) {
        const myScore = myAnime.rating || 0;
        const friendScore = friendMatch.rating || 0;
        const diff = Math.abs(myScore - friendScore);
        const isMasterpiece = myScore >= 8.5 && friendScore >= 8.5;
        list.push({
          myAnime,
          friendAnime: friendMatch,
          myScore,
          friendScore,
          scoreDiff: diff,
          isMasterpiece,
        });
      }
    }

    // Ordena priorizando masterpieces em comum e maior proximidade de notas
    return list.sort((a, b) => {
      if (a.isMasterpiece !== b.isMasterpiece) return a.isMasterpiece ? -1 : 1;
      return a.scoreDiff - b.scoreDiff;
    });
  }, [safeMyAnimes, safeFriendAnimes]);

  // O "Santo Graal" (Anime que ambos mais amaram e deram notas mais altas)
  const holyGrailAnime = useMemo(() => {
    const topCandidates = mutualAnimesList.filter(
      (item) => item.myScore >= 8 && item.friendScore >= 8
    );
    if (topCandidates.length === 0) return null;
    return topCandidates.reduce((best, cur) => {
      const bestSum = best.myScore + best.friendScore;
      const curSum = cur.myScore + cur.friendScore;
      return curSum > bestSum ? cur : best;
    }, topCandidates[0]);
  }, [mutualAnimesList]);

  // Animes filtrados por gênero na aba Em Comum
  const filteredMutualList = useMemo(() => {
    if (!selectedGenre) return mutualAnimesList;
    return mutualAnimesList.filter((item) => {
      const gList = item.myAnime.genres || item.friendAnime.genres || [];
      return gList.some((g) => g.toLowerCase() === selectedGenre.toLowerCase());
    });
  }, [mutualAnimesList, selectedGenre]);

  // Lista do amigo filtrada
  const filteredFriendAnimes = useMemo(() => {
    return safeFriendAnimes.filter((a) => {
      if (listSearch) {
        const q = listSearch.toLowerCase();
        const matchTitle = (a.title || '').toLowerCase().includes(q);
        const matchJap = (a.japaneseTitle || '').toLowerCase().includes(q);
        if (!matchTitle && !matchJap) return false;
      }
      if (listFilter === 'completed') return a.status === 'completed';
      if (listFilter === 'watching') return a.status === 'watching';
      if (listFilter === 'favorites') return (a.rating || 0) >= 9;
      return true;
    });
  }, [safeFriendAnimes, listSearch, listFilter]);

  if (!isOpen) return null;

  const myArchetype =
    (effectiveMyProfile?.archetype && ARCHETYPES[effectiveMyProfile.archetype]) ||
    ARCHETYPES.noble_heart;
  const friendArchetype =
    (effectiveFriendProfile?.archetype && ARCHETYPES[effectiveFriendProfile.archetype]) ||
    ARCHETYPES.noble_heart;

  const handleQuickAdd = (anime: Anime) => {
    const payload: Partial<Anime> = {
      title: anime.title,
      japaneseTitle: anime.japaneseTitle,
      coverUrl: anime.coverUrl,
      synopsis: anime.synopsis,
      genres: anime.genres,
      status: 'plan_to_watch',
      currentEpisode: 0,
      totalEpisodes: anime.totalEpisodes,
      rating: 0,
      format: anime.format,
      releaseYear: anime.releaseYear,
    };

    if (onAddAnimeToMyList) {
      onAddAnimeToMyList(payload);
    } else if (onAddAnimeFromFriend) {
      onAddAnimeFromFriend(payload);
    }
    setAddedAnimeIds((prev) => new Set(prev).add(String(anime.id || anime.title)));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/85 backdrop-blur-xl animate-fade-in">
      <div
        id="versus-modal-container"
        className="relative w-full sm:max-w-2xl lg:max-w-3xl h-[92vh] sm:h-auto sm:max-h-[90vh] flex flex-col bg-[#000000] border-t sm:border border-white/10 rounded-t-[32px] sm:rounded-3xl shadow-2xl overflow-hidden"
      >
        {/* Barra de puxar no topo para mobile */}
        <div className="sm:hidden pt-2.5 pb-1 flex justify-center">
          <div className="w-12 h-1 bg-zinc-800 rounded-full" />
        </div>

        {/* CABEÇALHO COMPACTO DE SINTONIA (All Black com Orbe Central) */}
        <div className="relative px-5 py-4 sm:px-6 sm:py-5 border-b border-white/10 bg-gradient-to-b from-zinc-950 via-[#000000] to-[#000000]">
          <button
            id="btn-close-versus-modal"
            onClick={onClose}
            className="absolute top-3 sm:top-4 right-4 p-2 rounded-full bg-zinc-900/80 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-white/10 transition-colors z-20"
            aria-label="Fechar comparação"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Dupla Conectada por Afinidade */}
          <div className="flex items-center justify-between max-w-lg mx-auto pr-8 sm:pr-0">
            {/* Lado Esquerdo: Você */}
            <div className="flex items-center gap-3 min-w-0">
              <div className="relative flex-shrink-0">
                <img
                  src={
                    effectiveMyAvatar ||
                    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=160&auto=format&fit=crop&q=80'
                  }
                  alt={effectiveMyUserName}
                  className="w-11 h-11 sm:w-13 sm:h-13 rounded-full object-cover ring-2 ring-cyan-500/50 shadow-md shadow-cyan-500/20"
                />
                <span className="absolute -bottom-1 -right-1 px-1 py-0.2 text-[8px] font-black uppercase tracking-wider bg-cyan-950 border border-cyan-500/40 text-cyan-300 rounded-full">
                  Você
                </span>
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-xs sm:text-sm text-white truncate max-w-[90px] sm:max-w-[130px]">
                  {effectiveMyUserName}
                </h3>
                <p className="text-[10px] text-zinc-400 font-medium truncate">
                  {safeMyAnimes.length} animes
                </p>
              </div>
            </div>

            {/* Centro: Orbe de Sintonia */}
            <div className="flex flex-col items-center justify-center px-2 flex-shrink-0">
              <div className="relative flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-zinc-950 border border-amber-500/40 shadow-[0_0_20px_rgba(245,158,11,0.15)]">
                <div className="flex flex-col items-center">
                  <span className="text-base sm:text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-400 to-rose-400 leading-none">
                    {compatibility.scorePercent}%
                  </span>
                  <span className="text-[8px] uppercase font-bold text-zinc-400 tracking-wider mt-0.5">
                    Sintonia
                  </span>
                </div>
              </div>
              <span className="mt-1 text-[9px] font-bold text-amber-300/90 tracking-wide uppercase px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 max-w-[140px] truncate text-center">
                {compatibility.levelDescription}
              </span>
            </div>

            {/* Lado Direito: Amigo */}
            <div className="flex items-center gap-3 min-w-0 flex-row-reverse text-right">
              <div className="relative flex-shrink-0">
                <img
                  src={
                    effectiveFriendAvatar ||
                    'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=160&auto=format&fit=crop&q=80'
                  }
                  alt={effectiveFriendUserName}
                  className="w-11 h-11 sm:w-13 sm:h-13 rounded-full object-cover ring-2 ring-purple-500/50 shadow-md shadow-purple-500/20"
                />
                <span className="absolute -bottom-1 -left-1 px-1 py-0.2 text-[8px] font-black uppercase tracking-wider bg-purple-950 border border-purple-500/40 text-purple-300 rounded-full">
                  Amigo
                </span>
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-xs sm:text-sm text-white truncate max-w-[90px] sm:max-w-[130px]">
                  {effectiveFriendUserName}
                </h3>
                <p className="text-[10px] text-zinc-400 font-medium truncate">
                  {safeFriendAnimes.length} animes
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* BARRA DE NAVEGAÇÃO EM PÍLULA FLUTUANTE (Compacta e Ágil) */}
        <div className="px-4 py-2.5 bg-[#000000] border-b border-white/5">
          <div className="flex items-center p-1 rounded-full bg-zinc-950 border border-white/10 overflow-x-auto scrollbar-none gap-1">
            <button
              id="btn-versus-tab-mutual"
              onClick={() => setActiveTab('mutual')}
              className={`flex-1 min-w-fit px-3 py-1.5 rounded-full text-xs font-bold transition-all flex items-center justify-center gap-1.5 whitespace-nowrap ${
                activeTab === 'mutual'
                  ? 'bg-white text-black shadow-md font-black'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-900/60'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Em Comum</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                activeTab === 'mutual' ? 'bg-black/15 text-black font-extrabold' : 'bg-zinc-800 text-zinc-400'
              }`}>
                {mutualAnimesList.length}
              </span>
            </button>

            <button
              id="btn-versus-tab-discover"
              onClick={() => setActiveTab('discover')}
              className={`flex-1 min-w-fit px-3 py-1.5 rounded-full text-xs font-bold transition-all flex items-center justify-center gap-1.5 whitespace-nowrap ${
                activeTab === 'discover'
                  ? 'bg-white text-black shadow-md font-black'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-900/60'
              }`}
            >
              <Compass className="w-3.5 h-3.5 text-cyan-400" />
              <span>Para Descobrir</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                activeTab === 'discover' ? 'bg-black/15 text-black font-extrabold' : 'bg-zinc-800 text-zinc-400'
              }`}>
                {compatibility.crossRecommendations.length}
              </span>
            </button>

            <button
              id="btn-versus-tab-divergence"
              onClick={() => setActiveTab('divergence')}
              className={`flex-1 min-w-fit px-3 py-1.5 rounded-full text-xs font-bold transition-all flex items-center justify-center gap-1.5 whitespace-nowrap ${
                activeTab === 'divergence'
                  ? 'bg-white text-black shadow-md font-black'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-900/60'
              }`}
            >
              <Flame className="w-3.5 h-3.5 text-orange-400" />
              <span>Divergências</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                activeTab === 'divergence' ? 'bg-black/15 text-black font-extrabold' : 'bg-zinc-800 text-zinc-400'
              }`}>
                {compatibility.epicDivergences.length}
              </span>
            </button>

            <button
              id="btn-versus-tab-full"
              onClick={() => setActiveTab('full_list')}
              className={`flex-1 min-w-fit px-3 py-1.5 rounded-full text-xs font-bold transition-all flex items-center justify-center gap-1.5 whitespace-nowrap ${
                activeTab === 'full_list'
                  ? 'bg-white text-black shadow-md font-black'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-900/60'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-purple-400" />
              <span>Coleção do Amigo</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                activeTab === 'full_list' ? 'bg-black/15 text-black font-extrabold' : 'bg-zinc-800 text-zinc-400'
              }`}>
                {safeFriendAnimes.length}
              </span>
            </button>
          </div>
        </div>

        {/* CORPO DO MODAL SCROLLÁVEL (All Black com Cards Nítidos) */}
        <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5 space-y-4 scrollbar-thin scrollbar-thumb-zinc-800">
          
          {/* ============================================================== */}
          {/* 1. ABA: EM COMUM (Animes que ambos assistiram com comparativo) */}
          {/* ============================================================== */}
          {activeTab === 'mutual' && (
            <div className="space-y-4">
              {/* O Santo Graal: Card Hero se houver anime 8.5+ em comum */}
              {holyGrailAnime && (
                <div className="relative p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-zinc-950 to-zinc-950 border border-amber-500/30 overflow-hidden shadow-lg">
                  <div className="flex items-center gap-1.5 text-amber-400 text-xs font-black uppercase tracking-wider mb-2">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    <span>O Santo Graal da Dupla (Ambos Amam)</span>
                  </div>
                  <div className="flex items-center gap-3.5">
                    <img
                      src={
                        holyGrailAnime.myAnime.coverUrl ||
                        'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=160&auto=format&fit=crop&q=80'
                      }
                      alt={holyGrailAnime.myAnime.title}
                      className="w-16 h-22 sm:w-18 sm:h-24 rounded-xl object-cover border border-amber-500/40 flex-shrink-0 cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => onOpenAnimeDetail && onOpenAnimeDetail(holyGrailAnime.myAnime)}
                    />
                    <div className="flex-1 min-w-0">
                      <h4
                        className="font-black text-sm sm:text-base text-white truncate cursor-pointer hover:text-amber-400 transition-colors"
                        onClick={() => onOpenAnimeDetail && onOpenAnimeDetail(holyGrailAnime.myAnime)}
                      >
                        {holyGrailAnime.myAnime.title}
                      </h4>
                      <p className="text-xs text-zinc-400 mt-0.5 line-clamp-1">
                        Sintonia máxima no gosto de vocês!
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="px-2.5 py-1 rounded-lg bg-cyan-950/80 border border-cyan-500/30 text-cyan-300 text-xs font-bold flex items-center gap-1">
                          <Star className="w-3 h-3 fill-cyan-400 text-cyan-400" />
                          Você: {holyGrailAnime.myScore}
                        </span>
                        <span className="px-2.5 py-1 rounded-lg bg-purple-950/80 border border-purple-500/30 text-purple-300 text-xs font-bold flex items-center gap-1">
                          <Star className="w-3 h-3 fill-purple-400 text-purple-400" />
                          Amigo: {holyGrailAnime.friendScore}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Filtro rápido por gêneros compartilhados */}
              {compatibility.commonGenres.length > 0 && (
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                  <button
                    onClick={() => setSelectedGenre(null)}
                    className={`px-3 py-1 rounded-full text-[11px] font-bold whitespace-nowrap transition-colors ${
                      !selectedGenre
                        ? 'bg-zinc-800 text-white border border-white/20'
                        : 'bg-zinc-950 text-zinc-400 hover:text-white border border-white/5'
                    }`}
                  >
                    Todos ({mutualAnimesList.length})
                  </button>
                  {compatibility.commonGenres.map((g, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedGenre(selectedGenre === g.genre ? null : g.genre)}
                      className={`px-3 py-1 rounded-full text-[11px] font-bold whitespace-nowrap transition-colors flex items-center gap-1 ${
                        selectedGenre === g.genre
                          ? 'bg-purple-950 text-purple-200 border border-purple-500/50'
                          : 'bg-zinc-950 text-zinc-400 hover:text-white border border-white/5'
                      }`}
                    >
                      <span>{g.genre}</span>
                      <span className="text-[9px] opacity-70">({g.count})</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Lista com posters verticais com presença */}
              {filteredMutualList.length === 0 ? (
                <div className="py-12 text-center rounded-2xl bg-zinc-950/60 border border-white/5 text-zinc-400 text-xs">
                  Nenhum anime em comum encontrado para esta seleção.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {filteredMutualList.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-3 p-3 rounded-2xl bg-zinc-950 border border-white/5 hover:border-white/15 transition-all shadow-md"
                    >
                      <img
                        src={
                          item.myAnime.coverUrl ||
                          item.friendAnime.coverUrl ||
                          'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=160&auto=format&fit=crop&q=80'
                        }
                        alt={item.myAnime.title}
                        className="w-16 h-22 rounded-xl object-cover flex-shrink-0 cursor-pointer hover:opacity-90 transition-opacity border border-white/5"
                        onClick={() => onOpenAnimeDetail && onOpenAnimeDetail(item.myAnime)}
                      />
                      <div className="flex-1 min-w-0">
                        <h5
                          className="font-bold text-xs sm:text-sm text-white truncate cursor-pointer hover:text-amber-400 transition-colors"
                          onClick={() => onOpenAnimeDetail && onOpenAnimeDetail(item.myAnime)}
                        >
                          {item.myAnime.title}
                        </h5>
                        <p className="text-[11px] text-zinc-400 truncate mt-0.5">
                          {item.myAnime.genres?.slice(0, 2).join(' • ') || 'Anime'}
                        </p>

                        <div className="flex items-center gap-2 mt-2">
                          <span className="px-2 py-0.5 rounded-md bg-cyan-950/60 border border-cyan-500/20 text-cyan-300 text-[11px] font-bold flex items-center gap-1">
                            <Star className="w-2.5 h-2.5 fill-cyan-400 text-cyan-400" />
                            {item.myScore ? `Você: ${item.myScore}` : 'Você: -'}
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-purple-950/60 border border-purple-500/20 text-purple-300 text-[11px] font-bold flex items-center gap-1">
                            <Star className="w-2.5 h-2.5 fill-purple-400 text-purple-400" />
                            {item.friendScore ? `Amigo: ${item.friendScore}` : 'Amigo: -'}
                          </span>
                        </div>

                        {item.scoreDiff <= 1 && item.myScore > 0 && item.friendScore > 0 ? (
                          <span className="inline-block text-[10px] text-emerald-400 font-semibold mt-1">
                            ✓ Sintonia pura (Notas idênticas)
                          </span>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ============================================================== */}
          {/* 2. ABA: PARA DESCOBRIR (O Baú de Ouro do Amigo com 1 Toque)     */}
          {/* ============================================================== */}
          {activeTab === 'discover' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-zinc-950 border border-cyan-500/20 flex items-start gap-3">
                <Compass className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
                <div className="text-xs">
                  <p className="font-bold text-white">
                    O que {effectiveFriendUserName} amou e você ainda não viu!
                  </p>
                  <p className="text-zinc-400 mt-0.5">
                    Obras com ótimas avaliações na lista do seu amigo que não constam na sua coleção. Toque em "Quero Ver" para adicionar na hora.
                  </p>
                </div>
              </div>

              {compatibility.crossRecommendations.length === 0 ? (
                <div className="py-16 text-center rounded-2xl bg-zinc-950 border border-white/5 text-zinc-400 text-xs">
                  Nenhuma recomendação nova no momento. Vocês já assistiram praticamente tudo que o outro tem!
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {compatibility.crossRecommendations.map((anime) => {
                    const animeKey = String(anime.id || anime.title);
                    const isAdded = addedAnimeIds.has(animeKey) || myAnimeTitles.has((anime.title || '').trim().toLowerCase());
                    return (
                      <div
                        key={animeKey}
                        className="flex items-center gap-3 p-3 rounded-2xl bg-zinc-950 border border-white/10 hover:border-white/20 transition-all shadow-md"
                      >
                        <img
                          src={
                            anime.coverUrl ||
                            'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=160&auto=format&fit=crop&q=80'
                          }
                          alt={anime.title}
                          className="w-18 h-26 rounded-xl object-cover flex-shrink-0 cursor-pointer hover:opacity-90 transition-opacity border border-white/5"
                          onClick={() => onOpenAnimeDetail && onOpenAnimeDetail(anime)}
                        />
                        <div className="flex-1 min-w-0">
                          <h5
                            className="font-bold text-xs sm:text-sm text-white truncate cursor-pointer hover:text-cyan-400 transition-colors"
                            onClick={() => onOpenAnimeDetail && onOpenAnimeDetail(anime)}
                          >
                            {anime.title}
                          </h5>
                          <p className="text-[11px] text-zinc-400 truncate mt-0.5">
                            {anime.genres?.slice(0, 2).join(' • ') || 'Anime'}
                          </p>

                          <div className="flex items-center gap-2 mt-1.5">
                            {anime.rating ? (
                              <span className="text-xs font-bold text-amber-400 flex items-center gap-1">
                                <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                                Nota: {anime.rating}
                              </span>
                            ) : null}
                            <span className="text-[10px] text-zinc-500">
                              {anime.totalEpisodes ? `${anime.totalEpisodes} eps` : 'Série'}
                            </span>
                          </div>

                          <div className="mt-2.5">
                            {isAdded ? (
                              <button
                                disabled
                                className="w-full py-1.5 px-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center justify-center gap-1.5"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Na sua Lista</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => handleQuickAdd(anime)}
                                className="w-full py-1.5 px-3 rounded-xl bg-white hover:bg-zinc-200 text-black text-xs font-black flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95"
                              >
                                <BookmarkPlus className="w-3.5 h-3.5" />
                                <span>+ Quero Ver</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ============================================================== */}
          {/* 3. ABA: DIVERGÊNCIAS (Onde o gosto foi diferente - Divertido)   */}
          {/* ============================================================== */}
          {activeTab === 'divergence' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-zinc-950 border border-orange-500/20 flex items-start gap-3">
                <Flame className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
                <div className="text-xs">
                  <p className="font-bold text-white">
                    Onde os gostos se dividiram!
                  </p>
                  <p className="text-zinc-400 mt-0.5">
                    Animes que ambos assistiram, mas tiveram opiniões e notas bem diferentes. Debates quentes da amizade!
                  </p>
                </div>
              </div>

              {compatibility.epicDivergences.length === 0 ? (
                <div className="py-16 text-center rounded-2xl bg-zinc-950 border border-white/5 text-zinc-400 text-xs">
                  Incrível! Vocês não têm nenhuma grande discordância de notas nos animes em comum.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {compatibility.epicDivergences.map((div, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 p-3.5 rounded-2xl bg-zinc-950 border border-orange-500/20 hover:border-orange-500/40 transition-all shadow-md"
                    >
                      <img
                        src={
                          div.coverUrl ||
                          'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=160&auto=format&fit=crop&q=80'
                        }
                        alt={div.title}
                        className="w-16 h-22 rounded-xl object-cover flex-shrink-0 border border-white/5 cursor-pointer"
                        onClick={() => {
                          const matched = safeMyAnimes.find((a) => a.title === div.title);
                          if (matched && onOpenAnimeDetail) onOpenAnimeDetail(matched);
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <h5 className="font-bold text-xs sm:text-sm text-white truncate">
                            {div.title}
                          </h5>
                          <span className="text-[10px] font-black text-orange-400 bg-orange-950/80 border border-orange-500/30 px-1.5 py-0.5 rounded-md flex-shrink-0">
                            Δ {div.diff} pts
                          </span>
                        </div>

                        <div className="flex items-center gap-2 mt-2">
                          <div className="flex-1 p-1.5 rounded-lg bg-zinc-900 border border-white/5 text-center">
                            <span className="block text-[10px] text-cyan-400 font-bold">Você</span>
                            <span className="font-black text-xs text-white">★ {div.userScore}</span>
                          </div>
                          <div className="flex-1 p-1.5 rounded-lg bg-zinc-900 border border-white/5 text-center">
                            <span className="block text-[10px] text-purple-400 font-bold">Amigo</span>
                            <span className="font-black text-xs text-white">★ {div.targetScore}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ============================================================== */}
          {/* 4. ABA: COLEÇÃO COMPLETA DO AMIGO                              */}
          {/* ============================================================== */}
          {activeTab === 'full_list' && (
            <div className="space-y-4">
              {/* Barra de Busca e Filtros Rápidos */}
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                  <input
                    type="text"
                    value={listSearch}
                    onChange={(e) => setListSearch(e.target.value)}
                    placeholder={`Buscar na coleção de ${effectiveFriendUserName}...`}
                    className="w-full pl-10 pr-4 py-2 rounded-xl bg-zinc-950 border border-white/10 text-white text-xs placeholder:text-zinc-500 focus:outline-none focus:border-white/30"
                  />
                  {listSearch && (
                    <button
                      onClick={() => setListSearch('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                  {(['all', 'completed', 'watching', 'favorites'] as const).map((filterKey) => {
                    const labels = {
                      all: 'Todos',
                      completed: 'Completos',
                      watching: 'Assistindo',
                      favorites: 'Favoritos (9+)',
                    };
                    return (
                      <button
                        key={filterKey}
                        onClick={() => setListFilter(filterKey)}
                        className={`px-3 py-1 rounded-full text-[11px] font-bold transition-colors whitespace-nowrap ${
                          listFilter === filterKey
                            ? 'bg-white text-black'
                            : 'bg-zinc-950 text-zinc-400 hover:text-white border border-white/10'
                        }`}
                      >
                        {labels[filterKey]}
                      </button>
                    );
                  })}
                </div>
              </div>

              {filteredFriendAnimes.length === 0 ? (
                <div className="py-16 text-center rounded-2xl bg-zinc-950 border border-white/5 text-zinc-400 text-xs">
                  Nenhum anime encontrado com os filtros atuais.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {filteredFriendAnimes.map((anime) => {
                    const animeKey = String(anime.id || anime.title);
                    const inMyList = myAnimeTitles.has((anime.title || '').trim().toLowerCase()) || addedAnimeIds.has(animeKey);
                    return (
                      <div
                        key={animeKey}
                        className="flex items-center gap-3 p-3 rounded-2xl bg-zinc-950 border border-white/10 hover:border-white/20 transition-all shadow-md"
                      >
                        <img
                          src={
                            anime.coverUrl ||
                            'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=160&auto=format&fit=crop&q=80'
                          }
                          alt={anime.title}
                          className="w-16 h-22 rounded-xl object-cover flex-shrink-0 cursor-pointer hover:opacity-90 transition-opacity border border-white/5"
                          onClick={() => onOpenAnimeDetail && onOpenAnimeDetail(anime)}
                        />
                        <div className="flex-1 min-w-0">
                          <h5
                            className="font-bold text-xs sm:text-sm text-white truncate cursor-pointer hover:text-purple-400 transition-colors"
                            onClick={() => onOpenAnimeDetail && onOpenAnimeDetail(anime)}
                          >
                            {anime.title}
                          </h5>
                          <div className="flex items-center gap-2 mt-1">
                            {anime.rating ? (
                              <span className="text-xs font-bold text-amber-400 flex items-center gap-0.5">
                                <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                                {anime.rating}
                              </span>
                            ) : null}
                            <span className="text-[10px] text-zinc-500">
                              {anime.status === 'completed'
                                ? 'Completo'
                                : anime.status === 'watching'
                                ? 'Assistindo'
                                : 'Salvo'}
                            </span>
                          </div>

                          <div className="mt-2">
                            {inMyList ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-500/20 px-2 py-0.5 rounded-md">
                                <Check className="w-3 h-3" />
                                Na sua Lista
                              </span>
                            ) : (
                              <button
                                onClick={() => handleQuickAdd(anime)}
                                className="py-1 px-2.5 rounded-lg bg-white/10 hover:bg-white text-white hover:text-black border border-white/20 text-[10px] font-black flex items-center gap-1 transition-all"
                              >
                                <Plus className="w-3 h-3" />
                                <span>Adicionar</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
