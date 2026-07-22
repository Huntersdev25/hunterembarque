import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, X } from 'lucide-react';
import { toast } from "sonner";

interface Language {
  name: string;
  level: string;
}

interface LanguageSelectorProps {
  languages: Language[];
  onLanguagesChange: (languages: Language[]) => void;
}

const LANGUAGE_OPTIONS = [
  'Português',
  'Inglês',
  'Espanhol',
  'Francês',
  'Alemão',
  'Italiano',
  'Chinês',
  'Japonês',
  'Coreano',
  'Árabe',
  'Russo',
  'Outros'
];

const PROFICIENCY_LEVELS = [
  { value: 'basico', label: 'Básico' },
  { value: 'intermediario', label: 'Intermediário' },
  { value: 'avancado', label: 'Avançado' },
  { value: 'fluente', label: 'Fluente' },
  { value: 'nativo', label: 'Nativo' }
];

export function LanguageSelector({ languages, onLanguagesChange }: LanguageSelectorProps) {
  const [newLanguage, setNewLanguage] = useState('');
  const [newLevel, setNewLevel] = useState('');
  const [customLanguage, setCustomLanguage] = useState('');

  const addLanguage = () => {
    const languageName = newLanguage === 'Outros' ? customLanguage : newLanguage;

    if (!languageName || !newLevel) {
      toast.error("Selecione um idioma e nível de proficiência");
      return;
    }

    // Verificar se já existe
    if (languages.some(lang => lang.name.toLowerCase() === languageName.toLowerCase())) {
      toast.error("Idioma já adicionado");
      return;
    }

    const updatedLanguages = [...languages, { name: languageName, level: newLevel }];
    onLanguagesChange(updatedLanguages);

    // Reset form
    setNewLanguage('');
    setNewLevel('');
    setCustomLanguage('');

    toast.success("Idioma adicionado com sucesso");
  };

  // Adiciona automaticamente ao selecionar idioma + nível (sem exigir clique no botão).
  // Para "Outros", ainda é necessário digitar o nome e confirmar (o botão trata esse caso).
  useEffect(() => {
    if (newLanguage && newLanguage !== 'Outros' && newLevel) {
      const exists = languages.some(lang => lang.name.toLowerCase() === newLanguage.toLowerCase());
      if (!exists) {
        onLanguagesChange([...languages, { name: newLanguage, level: newLevel }]);
      }
      setNewLanguage('');
      setNewLevel('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newLanguage, newLevel]);

  const removeLanguage = (indexToRemove: number) => {
    const updatedLanguages = languages.filter((_, index) => index !== indexToRemove);
    onLanguagesChange(updatedLanguages);
    toast.success("Idioma removido");
  };

  const getLevelLabel = (level: string) => {
    return PROFICIENCY_LEVELS.find(pl => pl.value === level)?.label || level;
  };

  return (
    <div className="space-y-4">
      {/* Lista de idiomas adicionados */}
      {languages.length > 0 && (
        <div className="space-y-2">
          <Label>Idiomas adicionados:</Label>
          <div className="flex flex-wrap gap-2">
            {languages.map((language, index) => (
              <Badge key={index} variant="secondary" className="px-3 py-1">
                {language.name} - {getLevelLabel(language.level)}
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-2 h-4 w-4 p-0 hover:bg-destructive/20"
                  onClick={() => removeLanguage(index)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Adicionar novo idioma */}
      <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
        <Label>Adicionar novo idioma:</Label>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="language">Idioma</Label>
            <Select value={newLanguage} onValueChange={setNewLanguage}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um idioma" />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGE_OPTIONS.map((language) => (
                  <SelectItem key={language} value={language}>
                    {language}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {newLanguage === 'Outros' && (
            <div className="space-y-2">
              <Label htmlFor="customLanguage">Nome do idioma</Label>
              <Input
                id="customLanguage"
                value={customLanguage}
                onChange={(e) => setCustomLanguage(e.target.value)}
                placeholder="Digite o nome do idioma"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="level">Nível de proficiência</Label>
            <Select value={newLevel} onValueChange={setNewLevel}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o nível" />
              </SelectTrigger>
              <SelectContent>
                {PROFICIENCY_LEVELS.map((level) => (
                  <SelectItem key={level.value} value={level.value}>
                    {level.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {newLanguage === 'Outros' && (
          <Button
            type="button"
            onClick={addLanguage}
            variant="outline"
            className="w-full"
            disabled={!newLevel || !customLanguage}
          >
            <Plus className="h-4 w-4 mr-2" />
            Adicionar idioma
          </Button>
        )}
        <p className="text-xs text-muted-foreground">
          Selecione o idioma e o nível — ele é adicionado automaticamente à lista.
        </p>
      </div>
    </div>
  );
}