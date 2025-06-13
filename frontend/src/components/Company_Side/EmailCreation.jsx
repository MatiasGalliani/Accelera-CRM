import React, { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Check, Mail, AlignLeft, AlignCenter, AlignRight, Bold, Italic, Image as ImageIcon, Upload, Code, Eye, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import TextAlign from '@tiptap/extension-text-align';
import Editor from '@monaco-editor/react';
import { auth } from '@/auth/firebase';
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const EmailCreation = () => {
  const [emailData, setEmailData] = useState({
    subject: '',
    content: '',
    selectedSources: []
  });

  const [loading, setLoading] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedImage, setUploadedImage] = useState(null);
  const [htmlContent, setHtmlContent] = useState('');
  const [isHtmlMode, setIsHtmlMode] = useState(false);
  const [activeTab, setActiveTab] = useState('editor');
  const [isUploading, setIsUploading] = useState(false);
  const [showSendConfirmation, setShowSendConfirmation] = useState(false);
  const [sources, setSources] = useState([]);
  const [loadingSources, setLoadingSources] = useState(true);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Image,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
    ],
    content: '',
    onUpdate: ({ editor }) => {
      setEmailData(prev => ({
        ...prev,
        content: editor.getHTML()
      }));
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none min-h-[200px] px-4 py-2',
      },
    },
  });

  // Initialize htmlContent with current email content when opening HTML editor
  useEffect(() => {
    if (isHtmlMode && editor) {
      const currentContent = editor.getHTML() || emailData.content;
      setHtmlContent(currentContent);
    }
  }, [isHtmlMode, emailData.content, editor]);

  // Fetch sources and their lead counts
  useEffect(() => {
    const fetchSources = async () => {
      try {
        const currentUser = auth.currentUser;
        if (!currentUser) return;

        const idToken = await currentUser.getIdToken(true);
        const response = await fetch('/api/email/sources', {
          headers: {
            'Authorization': `Bearer ${idToken}`
          }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch sources');
        }

        const data = await response.json();
        setSources(data.sources);
      } catch (error) {
        console.error('Error fetching sources:', error);
        toast.error('Errore nel caricamento delle fonti');
      } finally {
        setLoadingSources(false);
      }
    };

    fetchSources();
  }, []);

  const toggleSource = (sourceId) => {
    setEmailData(prev => {
      const isSelected = prev.selectedSources.includes(sourceId);
      const newSelectedSources = isSelected
        ? prev.selectedSources.filter(id => id !== sourceId)
        : [...prev.selectedSources, sourceId];

      return {
        ...prev,
        selectedSources: newSelectedSources
      };
    });
  };

  const handleFileUpload = async (file) => {
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
      toast.error('Per favore, carica solo file immagine');
      return;
    }

    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error('Errore durante il caricamento dell\'immagine');
      }

      const data = await response.json();
      setImageUrl(data.imageUrl);
      setUploadedImage(data.imageUrl);
      toast.success('Immagine caricata con successo');
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Errore durante il caricamento dell\'immagine');
    } finally {
      setIsUploading(false);
    }
  };

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileUpload(file);
    }
  }, []);

  const onDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const addImage = () => {
    if (imageUrl) {
      editor?.chain().focus().setImage({ src: imageUrl }).run();
      setImageUrl('');
      setUploadedImage(null);
    }
  };

  const handleSendEmail = async () => {
    if (!emailData.subject || !emailData.content) {
      toast.error('Per favore, compila tutti i campi richiesti');
      return;
    }

    if (emailData.selectedSources.length === 0) {
      toast.error('Per favore, seleziona almeno una fonte');
      return;
    }

    try {
      setLoading(true);
      
      // Get a fresh token from Firebase
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('Utente non autenticato');
      }
      
      const idToken = await currentUser.getIdToken(true);
      
      const response = await fetch('/api/email/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({
          subject: emailData.subject,
          content: emailData.content,
          sources: emailData.selectedSources
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Impossibile inviare l'email");
      }

      const result = await response.json();
      toast.success(`Email inviata con successo a ${result.recipients} destinatari!`);
      
      // Reset form
      setEmailData({
        subject: '',
        content: '',
        selectedSources: []
      });
      editor?.commands.setContent('');
    } catch (error) {
      console.error('Error sending email:', error);
      toast.error(error.message || "Impossibile inviare l'email");
    } finally {
      setLoading(false);
    }   
  };

  const handleHtmlSubmit = () => {
    if (!htmlContent.trim()) {
      toast.error('Per favore, inserisci il contenuto HTML');
      return;
    }

    // Update both the editor and emailData with the new HTML content
    editor?.commands.setContent(htmlContent);
    setEmailData(prev => ({
      ...prev,
      content: htmlContent
    }));
    setIsHtmlMode(false);
    toast.success('Contenuto HTML aggiunto con successo');
  };

  const handleEditorChange = (value) => {
    setHtmlContent(value || '');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto p-6 space-y-6 mt-8 max-w-5xl">
        <Card className="shadow-lg border-none">
          <CardHeader className="border-b bg-muted/5">
            <div className="flex items-center justify-between">
              <CardTitle className="text-2xl font-bold">Crea campagna email</CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => {
                    setEmailData({
                      subject: '',
                      content: '',
                      selectedSources: []
                    });
                    editor?.commands.setContent('');
                  }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-refresh-cw"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/></svg>
                  Reset
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-8">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <Label htmlFor="subject" className="text-base font-medium">Oggetto</Label>
                  <span className="text-sm text-muted-foreground">
                    {emailData.subject.length}/100 caratteri
                  </span>
                </div>
                <Input
                  id="subject"
                  value={emailData.subject}
                  onChange={(e) => setEmailData(prev => ({ ...prev, subject: e.target.value.slice(0, 100) }))}
                  placeholder="Inserisci l'oggetto dell'email"
                  maxLength={100}
                  className="h-12 text-lg"
                />
              </div>

              <div className="space-y-4">
                <Label className="text-base font-medium">Contenuto email</Label>
                <div className="border rounded-lg overflow-hidden shadow-sm">
                  <div className="border-b bg-muted/5 p-3 flex items-center gap-2 flex-wrap">
                    <TooltipProvider>
                      <ToggleGroup type="single" size="sm" className="bg-background rounded-md p-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <ToggleGroupItem
                              value="left"
                              onClick={() => editor?.chain().focus().setTextAlign('left').run()}
                              className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                            >
                              <AlignLeft className="h-4 w-4" />
                            </ToggleGroupItem>
                          </TooltipTrigger>
                          <TooltipContent>Allinea a sinistra</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <ToggleGroupItem
                              value="center"
                              onClick={() => editor?.chain().focus().setTextAlign('center').run()}
                              className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                            >
                              <AlignCenter className="h-4 w-4" />
                            </ToggleGroupItem>
                          </TooltipTrigger>
                          <TooltipContent>Allinea al centro</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <ToggleGroupItem
                              value="right"
                              onClick={() => editor?.chain().focus().setTextAlign('right').run()}
                              className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                            >
                              <AlignRight className="h-4 w-4" />
                            </ToggleGroupItem>
                          </TooltipTrigger>
                          <TooltipContent>Allinea a destra</TooltipContent>
                        </Tooltip>
                      </ToggleGroup>

                      <div className="h-6 w-px bg-border mx-2" />

                      <ToggleGroup type="single" size="sm" className="bg-background rounded-md p-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <ToggleGroupItem
                              value="bold"
                              onClick={() => editor?.chain().focus().toggleBold().run()}
                              className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                            >
                              <Bold className="h-4 w-4" />
                            </ToggleGroupItem>
                          </TooltipTrigger>
                          <TooltipContent>Grassetto (Ctrl+B)</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <ToggleGroupItem
                              value="italic"
                              onClick={() => editor?.chain().focus().toggleItalic().run()}
                              className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                            >
                              <Italic className="h-4 w-4" />
                            </ToggleGroupItem>
                          </TooltipTrigger>
                          <TooltipContent>Corsivo (Ctrl+I)</TooltipContent>
                        </Tooltip>
                      </ToggleGroup>

                      <div className="h-6 w-px bg-border mx-2" />

                      <Dialog>
                        <DialogTrigger asChild>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="sm" className="hover:bg-primary/10">
                                <ImageIcon className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Aggiungi immagine</TooltipContent>
                          </Tooltip>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[500px]">
                          <DialogHeader>
                            <DialogTitle>Aggiungi immagine</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <div
                              className={cn(
                                "border-2 border-dashed rounded-lg p-8 text-center transition-colors duration-200",
                                isDragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50",
                              )}
                              onDrop={onDrop}
                              onDragOver={onDragOver}
                              onDragLeave={onDragLeave}
                            >
                              {isUploading ? (
                                <Loader2 className="h-10 w-10 mx-auto mb-4 animate-spin text-primary" />
                              ) : (
                                <Upload className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
                              )}
                              <p className="text-sm text-muted-foreground mb-4">
                                {isUploading ? 'Caricamento in corso...' : 'Trascina un\'immagine qui o'}
                              </p>
                              <Input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                id="image-upload"
                                onChange={(e) => handleFileUpload(e.target.files[0])}
                                disabled={isUploading}
                              />
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => document.getElementById('image-upload').click()}
                                disabled={isUploading}
                                className="gap-2"
                              >
                                <Upload className="h-4 w-4" />
                                Seleziona file
                              </Button>
                            </div>

                            <div className="space-y-2">
                              <Label>Oppure inserisci URL immagine</Label>
                              <Input
                                placeholder="Inserisci l'URL dell'immagine"
                                value={imageUrl}
                                onChange={(e) => setImageUrl(e.target.value)}
                                disabled={isUploading}
                              />
                            </div>

                            {uploadedImage && (
                              <div className="mt-4 space-y-2">
                                <Label>Anteprima immagine caricata:</Label>
                                <div className="relative aspect-video rounded-lg overflow-hidden border">
                                  <img
                                    src={uploadedImage}
                                    alt="Preview"
                                    className="object-contain w-full h-full"
                                  />
                                </div>
                              </div>
                            )}

                            <Button 
                              onClick={addImage}
                              disabled={!imageUrl || isUploading}
                              className="w-full gap-2"
                            >
                              {isUploading ? (
                                <>
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                  Caricamento...
                                </>
                              ) : (
                                <>
                                  <ImageIcon className="h-4 w-4" />
                                  Aggiungi immagine
                                </>
                              )}
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>

                      <div className="h-6 w-px bg-border mx-2" />

                      <Dialog open={isHtmlMode} onOpenChange={setIsHtmlMode}>
                        <DialogTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="hover:bg-primary/10"
                            onClick={() => setIsHtmlMode(true)}
                          >
                            <Code className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-[90vw] w-[1200px] h-[90vh] p-0">
                          <DialogHeader className="px-6 py-4 border-b">
                            <DialogTitle>Editor HTML</DialogTitle>
                            <DialogDescription>
                              Scrivi o modifica il contenuto HTML dell'email
                            </DialogDescription>
                          </DialogHeader>
                          <div className="flex-1 overflow-hidden">
                            <Editor
                              height="calc(90vh - 180px)"
                              defaultLanguage="html"
                              theme="vs-dark"
                              value={htmlContent}
                              onChange={handleEditorChange}
                              options={{
                                minimap: { enabled: false },
                                fontSize: 14,
                                wordWrap: 'on',
                                automaticLayout: true,
                                suggestOnTriggerCharacters: true,
                                quickSuggestions: true,
                                tabSize: 2,
                                formatOnPaste: true,
                                formatOnType: true,
                                autoClosingBrackets: 'always',
                                autoClosingQuotes: 'always',
                                autoClosingTags: 'always',
                                autoIndent: 'full',
                                folding: true,
                                lineNumbers: 'on',
                                scrollBeyondLastLine: false,
                                snippetSuggestions: 'inline',
                                suggest: {
                                  preview: true,
                                  showMethods: true,
                                  showFunctions: true,
                                  showConstructors: true,
                                  showFields: true,
                                  showVariables: true,
                                  showClasses: true,
                                  showStructs: true,
                                  showInterfaces: true,
                                  showModules: true,
                                  showProperties: true,
                                  showEvents: true,
                                  showOperators: true,
                                  showUnits: true,
                                  showValues: true,
                                  showConstants: true,
                                  showEnums: true,
                                  showEnumMembers: true,
                                  showKeywords: true,
                                  showWords: true,
                                  showColors: true,
                                  showFiles: true,
                                  showReferences: true,
                                  showFolders: true,
                                  showTypeParameters: true,
                                  showSnippets: true
                                }
                              }}
                            />
                          </div>
                          <div className="flex justify-end gap-2 p-4 border-t">
                            <Button
                              variant="outline"
                              onClick={() => {
                                setIsHtmlMode(false);
                                setHtmlContent('');
                              }}
                            >
                              Annulla
                            </Button>
                            <Button onClick={handleHtmlSubmit}>
                              Aggiungi HTML
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </TooltipProvider>
                  </div>
                  <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="w-full justify-start border-b rounded-none px-4 bg-muted/5">
                      <TabsTrigger value="editor" className="data-[state=active]:bg-background">Editor</TabsTrigger>
                      <TabsTrigger value="preview" className="data-[state=active]:bg-background">Anteprima</TabsTrigger>
                    </TabsList>
                    <TabsContent value="editor" className="mt-0 p-4">
                      <div 
                        className="cursor-text min-h-[300px]"
                        onClick={() => editor?.commands.focus()}
                      >
                        <EditorContent editor={editor} />
                      </div>
                    </TabsContent>
                    <TabsContent value="preview" className="mt-0 p-4">
                      <div 
                        className="prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto min-h-[300px] p-4 border rounded-lg bg-muted/5"
                        dangerouslySetInnerHTML={{ __html: emailData.content }}
                      />
                    </TabsContent>
                  </Tabs>
                </div>
              </div>

              <div className="space-y-4">
                <Label className="text-base font-medium">Seleziona fonti</Label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {loadingSources ? (
                    <div className="col-span-3 flex justify-center">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  ) : sources.length === 0 ? (
                    <div className="col-span-3 text-center text-muted-foreground">
                      Nessuna fonte disponibile
                    </div>
                  ) : (
                    sources.map((source) => (
                      <Button
                        key={source.id}
                        variant={emailData.selectedSources.includes(source.id) ? "default" : "outline"}
                        className={cn(
                          "h-auto py-6 px-4 flex items-center justify-center transition-all duration-200",
                          emailData.selectedSources.includes(source.id) 
                            ? "ring-2 ring-primary ring-offset-2 shadow-lg" 
                            : "hover:bg-muted/50"
                        )}
                        onClick={() => toggleSource(source.id)}
                      >
                        <div className="flex flex-col items-center gap-1">
                          <span className="font-medium">
                            {source.id === 'aimedici' ? 'AIMedici.it' : 
                             source.id === 'aiquinto' ? 'AIQuinto.it' : 
                             source.id === 'aifidi' ? 'AIFidi.it' :
                             source.label}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {source.leadCount} {source.leadCount === 1 ? 'lead' : 'leads'}
                          </span>
                        </div>
                        {emailData.selectedSources.includes(source.id) && (
                          <Check className="ml-2 h-4 w-4" />
                        )}
                      </Button>
                    ))
                  )}
                </div>
              </div>

              <Dialog open={showSendConfirmation} onOpenChange={setShowSendConfirmation}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Conferma invio email</DialogTitle>
                    <DialogDescription>
                      Stai per inviare questa email a tutti i destinatari delle fonti selezionate. Vuoi procedere?
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setShowSendConfirmation(false)}
                    >
                      Annulla
                    </Button>
                    <Button
                      onClick={() => {
                        setShowSendConfirmation(false);
                        handleSendEmail();
                      }}
                      disabled={loading}
                      className="gap-2"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Invio in corso...
                        </>
                      ) : (
                        <>
                          <Mail className="h-4 w-4" />
                          Conferma invio
                        </>
                      )}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Button
                onClick={() => setShowSendConfirmation(true)}
                disabled={loading}
                className="w-full mt-6 h-12 text-lg gap-2"
                size="lg"
              >
                <Mail className="h-5 w-5" />
                {loading ? 'Invio in corso...' : 'Invia email'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default EmailCreation;