import { useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { useVisionBoard, useAddVisionBoardImage, useGenerateVisionBoardImage } from "@/hooks/use-vision-boards";
import { useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Plus, Wand2, ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion } from "framer-motion";

export default function VisionBoardDetail() {
  const [, params] = useRoute("/vision-board/:id");
  const id = parseInt(params!.id);
  const { data: board, isLoading } = useVisionBoard(id);

  if (isLoading) return <Layout>Loading...</Layout>;
  if (!board) return <Layout>Board not found</Layout>;

  return (
    <Layout>
      <div className="mb-8">
        <Link href="/vision-board" className="text-sm text-muted-foreground hover:text-white mb-4 inline-flex items-center gap-1">
          <ArrowLeft className="h-4 w-4" /> Back to boards
        </Link>
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-4xl font-display font-bold text-white mb-2">{board.title}</h1>
            <p className="text-muted-foreground">{board.description}</p>
          </div>
          <AddImageDialog boardId={id} />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 auto-rows-[200px]">
        {board.images.map((img, idx) => (
          <motion.div
            key={img.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: idx * 0.1 }}
            className={`relative group overflow-hidden rounded-xl border border-white/5 bg-black/20 ${
              idx % 3 === 0 ? 'md:col-span-2 md:row-span-2' : ''
            }`}
          >
            <img 
              src={img.imageUrl} 
              alt={img.caption || "Vision board image"} 
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-4 flex items-end">
              <p className="text-white font-medium">{img.caption}</p>
            </div>
          </motion.div>
        ))}
        {board.images.length === 0 && (
          <div className="col-span-full py-20 text-center border-2 border-dashed border-white/10 rounded-xl">
             <p className="text-muted-foreground mb-4">This canvas is empty.</p>
             <AddImageDialog boardId={id} trigger={<Button variant="outline">Add your first image</Button>} />
          </div>
        )}
      </div>
    </Layout>
  );
}

function AddImageDialog({ boardId, trigger }: { boardId: number, trigger?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const addImage = useAddVisionBoardImage();
  const generateImage = useGenerateVisionBoardImage();
  
  const [url, setUrl] = useState("");
  const [caption, setCaption] = useState("");
  const [prompt, setPrompt] = useState("");

  const handleAddUrl = () => {
    addImage.mutate({ id: boardId, imageUrl: url, caption }, {
      onSuccess: () => {
        setOpen(false);
        setUrl("");
        setCaption("");
      }
    });
  };

  const handleGenerate = () => {
    generateImage.mutate({ prompt }, {
      onSuccess: (data) => {
        addImage.mutate({ id: boardId, imageUrl: data.imageUrl, caption: prompt }, {
          onSuccess: () => {
            setOpen(false);
            setPrompt("");
          }
        });
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Image
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="glass-panel border-white/10 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Add to Vision Board</DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="generate" className="w-full mt-4">
          <TabsList className="grid w-full grid-cols-2 bg-black/20">
            <TabsTrigger value="generate">AI Generate</TabsTrigger>
            <TabsTrigger value="url">Image URL</TabsTrigger>
          </TabsList>
          
          <TabsContent value="generate" className="space-y-4 pt-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">What do you want to visualize?</label>
              <Input 
                value={prompt} 
                onChange={(e) => setPrompt(e.target.value)} 
                className="glass-input" 
                placeholder="e.g. A peaceful cabin in the mountains" 
              />
            </div>
            <Button 
              className="w-full" 
              onClick={handleGenerate} 
              isLoading={generateImage.isPending || addImage.isPending}
              disabled={!prompt}
            >
              <Wand2 className="h-4 w-4 mr-2" />
              Manifest Image
            </Button>
          </TabsContent>
          
          <TabsContent value="url" className="space-y-4 pt-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Image URL</label>
              <Input 
                value={url} 
                onChange={(e) => setUrl(e.target.value)} 
                className="glass-input" 
                placeholder="https://..." 
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Caption (Optional)</label>
              <Input 
                value={caption} 
                onChange={(e) => setCaption(e.target.value)} 
                className="glass-input" 
                placeholder="My dream home" 
              />
            </div>
            <Button 
              className="w-full" 
              onClick={handleAddUrl} 
              isLoading={addImage.isPending}
              disabled={!url}
            >
              Add Image
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
