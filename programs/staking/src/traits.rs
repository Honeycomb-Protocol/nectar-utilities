pub trait Default {
    const LEN: usize;
    fn set_defaults(&mut self);
}
