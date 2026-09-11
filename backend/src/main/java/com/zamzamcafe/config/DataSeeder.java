package com.zamzamcafe.config;
import com.zamzamcafe.model.Product;
import com.zamzamcafe.repository.ProductRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class DataSeeder {
  @Bean CommandLineRunner seed(ProductRepository repo) {
    return args -> {
      if(repo.count()>0) return;
      add(repo,"Chicken Burger","Juicy chicken burger with fresh salad.",650,"Burgers","https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=900&q=80");
      add(repo,"Zinger Burger","Crispy zinger chicken burger.",750,"Burgers","https://images.unsplash.com/photo-1553979459-d2229ba7433a?auto=format&fit=crop&w=900&q=80");
      add(repo,"Chicken Pizza","Cheesy chicken pizza.",1400,"Pizza","https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=900&q=80");
      add(repo,"Fries","Crispy golden fries.",300,"Sides","https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=900&q=80");
      add(repo,"Chicken Roll","Fresh chicken roll.",450,"Rolls","https://images.unsplash.com/photo-1563379091339-03246963d96c?auto=format&fit=crop&w=900&q=80");
      add(repo,"Cold Drink","Chilled soft drink.",150,"Drinks","https://images.unsplash.com/photo-1544145945-f90425340c7e?auto=format&fit=crop&w=900&q=80");
    };
  }
  private void add(ProductRepository r,String n,String d,int p,String c,String i){Product x=new Product();x.setName(n);x.setDescription(d);x.setPrice(p);x.setCategory(c);x.setImageUrl(i);x.setAvailable(true);r.save(x);}
}