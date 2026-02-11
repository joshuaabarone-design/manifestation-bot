import { useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { useVisionBoards, useCreateVisionBoard } from "@/hooks/use-vision-boards";
import { Button } from "@/components/ui/button";
import { Plus, Image as ImageIcon, ArrowRight } from "lucide-react";
import { Link } from "wouter";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { VisionBoardPageSkeleton } from "@/components/ui/loading-skeleton";

export default function VisionBoard() {
  const { data: boards, isLoading } = useVisionBoards();

  if (isLoading) {
    return (
      <Layout>
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4 mb-6 lg:mb-8">
          <div>
            <h1 className="text-2xl lg:text-3xl font-display font-bold text-white mb-1 lg:mb-2">Vision Boards</h1>
            <p className="text-sm lg:text-base text-muted-foreground">Visualize your future reality.</p>
          </div>
        </div>
        <VisionBoardPageSkeleton />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4 mb-6 lg:mb-8">
        <div>
          <h1 className="text-2xl lg:text-3xl font-display font-bold text-white mb-1 lg:mb-2">Vision Boards</h1>
          <p className="text-sm lg:text-base text-muted-foreground">Visualize your future reality.</p>
        </div>
        <CreateBoardDialog />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {boards?.map((board) => (
          <Link key={board.id} href={`/vision-board/${board.id}`} data-testid={`link-vision-board-${board.id}`}>
            <div className="glass-panel aspect-video rounded-2xl p-6 flex flex-col justify-between hover:border-primary/50 transition-all cursor-pointer group bg-gradient-to-br from-card/60 to-purple-900/10">
              <div>
                <h3 className="text-xl font-bold text-white mb-2 group-hover:text-primary transition-colors">
                  {board.title}
                </h3>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {board.description}
                </p>
              </div>
              <div className="flex justify-between items-end">
                <div className="flex -space-x-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                      <ImageIcon className="h-3 w-3 text-muted-foreground" />
                    </div>
                  ))}
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors transform group-hover:translate-x-1" />
              </div>
            </div>
          </Link>
        ))}

        <CreateBoardDialog trigger={
          <button className="aspect-video rounded-2xl border-2 border-dashed border-white/10 flex flex-col items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/30 hover:bg-white/5 transition-all" data-testid="button-create-board-card">
            <Plus className="h-8 w-8 mb-2" />
            <span className="font-medium">Create New Board</span>
          </button>
        } />
      </div>
    </Layout>
  );
}

function CreateBoardDialog({ trigger }: { trigger?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const createBoard = useCreateVisionBoard();
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createBoard.mutate({ title, description: desc }, {
      onSuccess: () => {
        setOpen(false);
        setTitle("");
        setDesc("");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button data-testid="button-new-board">
            <Plus className="h-4 w-4 mr-2" />
            New Board
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="glass-panel border-white/10">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Create Vision Board</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Title</label>
            <Input 
              value={title} 
              onChange={(e) => setTitle(e.target.value)} 
              className="glass-input" 
              placeholder="e.g. 2025 Dream Life"
              required 
              data-testid="input-board-title"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Description</label>
            <Textarea 
              value={desc} 
              onChange={(e) => setDesc(e.target.value)} 
              className="glass-input" 
              placeholder="What is this board about?"
              data-testid="input-board-description"
            />
          </div>
          <div className="flex justify-end pt-4">
            <Button type="submit" isLoading={createBoard.isPending} data-testid="button-submit-board">Create Board</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
